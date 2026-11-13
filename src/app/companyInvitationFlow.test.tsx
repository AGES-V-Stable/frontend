import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '@/app/AppRoutes'
import { postLoginDestination } from '@/app/postLoginDestination'
import { saveLoginToken, SessionProvider, useSession } from '@/features/auth'
import { Login } from '@/features/auth/pages/Login'
import { CompanyInvitation } from '@/features/invitations'
import { PATHS } from '@/shared/navigation/paths'
import {
  acceptedMember,
  apiError,
  companyProfile,
  existingUserInvitation,
  INVITATION_LINK_HASH,
  INVITATION_STORAGE_KEY,
  INVITATION_TOKEN,
  json,
  newUserAcceptance,
  requestsTo,
  resolvedInvitation,
  stubApi,
  userJwt,
  userWithMembership,
  userWithoutCompany,
} from '@/test/fixtures/companyInvitation'

const RESOLVE = 'POST /v1/company-invitations/resolve'
const ACCEPT_NEW = 'POST /v1/company-invitations/accept-new-user'
const ACCEPT = 'POST /v1/company-invitations/accept'
const LOGIN = 'POST /v1/auth/login'
const VERIFY_2FA = 'POST /v1/auth/login/verify-2fa'
const ME = 'GET /v1/users/me'
const COMPANY = `GET /v1/companies/${companyProfile.id}`

function CurrentPath() {
  return <p data-testid="current-path">{useLocation().pathname}</p>
}

/** Representa Meu acesso com o contexto recarregado da sessão. */
function MyAccessProbe() {
  const { status, company, user } = useSession()
  return status === 'authenticated' ? (
    <p>
      Meu acesso: {company?.tradeName} — {user?.companyAccess?.role}
    </p>
  ) : (
    <p>Carregando sessão</p>
  )
}

function renderApplication() {
  return render(
    <MemoryRouter initialEntries={[`${PATHS.COMPANY_INVITATION}${INVITATION_LINK_HASH}`]}>
      <SessionProvider>
        <Routes>
          <Route path={PATHS.COMPANY_INVITATION} element={<CompanyInvitation />} />
          <Route path={PATHS.LOGIN} element={<Login resolveDestination={postLoginDestination} />} />
          <Route path={PATHS.MEMBERS} element={<MyAccessProbe />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  )
}

const tokenNeverPersisted = () =>
  expect(JSON.stringify({ ...localStorage })).not.toContain(INVITATION_TOKEN)

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => vi.unstubAllGlobals())

describe('company invitation flow', () => {
  it('existing user: logs in with 2FA, returns to the invitation, confirms and opens Meu acesso with a refreshed session', async () => {
    // Given an invitation for an identity that already exists and uses 2FA
    const user = userEvent.setup()
    let accepted = false
    const fetchMock = stubApi({
      [RESOLVE]: json(existingUserInvitation),
      [LOGIN]: json({ requires2fa: true, challengeToken: 'challenge-1' }),
      [VERIFY_2FA]: [
        apiError(401, 'INVALID_2FA_CODE', 'Código inválido.'),
        json({ token: userJwt }, { headers: { Authorization: `Bearer ${userJwt}` } }),
      ],
      [ME]: () => json(accepted ? userWithMembership : userWithoutCompany),
      [COMPANY]: json(companyProfile),
      [ACCEPT]: () => {
        accepted = true
        return json(acceptedMember)
      },
    })
    renderApplication()

    // When the user chooses to sign in with the existing account
    await user.click(await screen.findByRole('button', { name: 'Entrar na minha conta' }))

    // Then the normal login opens with the invitation e-mail
    expect(await screen.findByLabelText('E-mail')).toHaveValue('mariana@agrosul.com.br')
    await user.type(screen.getByLabelText('Senha'), 'SenhaAtual1!')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    // And a wrong second factor neither authenticates nor consumes the invitation
    await user.type(await screen.findByLabelText('Código de autenticação'), '000000')
    await user.click(screen.getByRole('button', { name: 'Verificar e Entrar' }))
    expect(await screen.findByText('Código de autenticação inválido ou expirado.')).toBeVisible()
    expect(localStorage.getItem('token')).toBeNull()
    expect(sessionStorage.getItem(INVITATION_STORAGE_KEY)).toBe(INVITATION_TOKEN)

    // When the correct code is informed, the user returns to confirm the invitation
    await user.clear(screen.getByLabelText('Código de autenticação'))
    await user.type(screen.getByLabelText('Código de autenticação'), '123456')
    await user.click(screen.getByRole('button', { name: 'Verificar e Entrar' }))
    expect(await screen.findByText(/Você está conectado como/)).toBeInTheDocument()
    expect(requestsTo(fetchMock, ACCEPT)).toHaveLength(0)
    expect(requestsTo(fetchMock, LOGIN)[0].body).toEqual({
      email: 'mariana@agrosul.com.br',
      password: 'SenhaAtual1!',
    })

    // When the user explicitly confirms
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Confirmar e acessar' }))

    // Then Meu acesso opens with the company and profile reloaded from /v1/users/me
    expect(
      await screen.findByText('Meu acesso: Cooperativa AgroSul — OPERATOR'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, ACCEPT)).toHaveLength(1)
    expect(requestsTo(fetchMock, ACCEPT)[0].headers.Authorization).toBe(`Bearer ${userJwt}`)
    expect(sessionStorage.getItem(INVITATION_STORAGE_KEY)).toBeNull()
    tokenNeverPersisted()
  })

  it('new user: creates the access, signs in normally and opens Meu acesso without consuming the invitation again', async () => {
    // Given an invitation for a new identity
    const user = userEvent.setup()
    const fetchMock = stubApi({
      [RESOLVE]: json(resolvedInvitation),
      [ACCEPT_NEW]: json(newUserAcceptance, { status: 201 }),
      [LOGIN]: new Response(null, { status: 200, headers: { Authorization: `Bearer ${userJwt}` } }),
      [ME]: json(userWithMembership),
      [COMPANY]: json(companyProfile),
    })
    renderApplication()

    // When the user creates the password and accepts the terms
    await user.type(await screen.findByLabelText('Senha'), 'Segura123!')
    await user.type(screen.getByLabelText('Confirmar senha'), 'Segura123!')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Aceitar e acessar' }))

    // Then the normal login opens with the invitation e-mail and no session yet
    expect(
      await screen.findByText(
        'Seu acesso foi criado. Entre com seu e-mail e senha para continuar.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveValue('mariana@agrosul.com.br')
    expect(localStorage.getItem('token')).toBeNull()

    // When the user signs in
    await user.type(screen.getByLabelText('Senha'), 'Segura123!')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    // Then Meu acesso opens directly, without the individual KYC wizard or a second acceptance
    expect(
      await screen.findByText('Meu acesso: Cooperativa AgroSul — OPERATOR'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, RESOLVE)).toHaveLength(1)
    expect(requestsTo(fetchMock, ACCEPT_NEW)).toHaveLength(1)
    expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith('/v1/onboarding'))).toBe(
      false,
    )
    expect(sessionStorage.getItem(INVITATION_STORAGE_KEY)).toBeNull()
    tokenNeverPersisted()
  })
})

describe('company invitation flow with the application routes', () => {
  it('opens the real members page (frontend#109) at /app/membros after the acceptance, not the dashboard', async () => {
    // Given the invited user already authenticated and the full application routes
    const user = userEvent.setup()
    saveLoginToken(userJwt)
    let accepted = false
    stubApi({
      [RESOLVE]: json(existingUserInvitation),
      [ME]: () => json(accepted ? userWithMembership : userWithoutCompany),
      [COMPANY]: json(companyProfile),
      [ACCEPT]: () => {
        accepted = true
        return json(acceptedMember)
      },
    })
    render(
      <MemoryRouter initialEntries={[`${PATHS.COMPANY_INVITATION}${INVITATION_LINK_HASH}`]}>
        <SessionProvider>
          <AppRoutes />
          <CurrentPath />
        </SessionProvider>
      </MemoryRouter>,
    )

    // When the user confirms the invitation
    await user.click(await screen.findByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Confirmar e acessar' }))

    // Then the members page of frontend#109 opens inside the company shell
    expect(await screen.findByRole('heading', { name: 'Membros' })).toBeInTheDocument()
    expect(
      screen.getByText('A gestão de membros é exclusiva do proprietário da empresa.'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('current-path')).toHaveTextContent(/^\/app\/membros$/)
    expect(screen.getByText('Cooperativa AgroSul')).toBeInTheDocument()
    expect(screen.queryByText('Carregando dashboard...')).not.toBeInTheDocument()
  })
})
