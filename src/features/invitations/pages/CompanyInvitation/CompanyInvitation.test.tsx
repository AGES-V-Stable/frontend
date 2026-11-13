import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/features/auth'
import { getLoginToken, saveLoginToken } from '@/shared/http/authToken'
import { PATHS } from '@/shared/navigation/paths'
import {
  adminJwt,
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
import { clearInvitationToken } from '../../model/invitationToken'
import { CompanyInvitation } from './CompanyInvitation'

const RESOLVE = 'POST /v1/company-invitations/resolve'
const ACCEPT_NEW = 'POST /v1/company-invitations/accept-new-user'
const ACCEPT = 'POST /v1/company-invitations/accept'
const ME = 'GET /v1/users/me'
const COMPANY = `GET /v1/companies/${companyProfile.id}`
const VALID_PASSWORD = 'Segura123!'

function CurrentLocation() {
  const { pathname, hash } = useLocation()
  return <p data-testid="location">{pathname + hash}</p>
}

function LoginProbe() {
  return (
    <>
      <p>Página de login</p>
      <pre data-testid="login-state">{JSON.stringify(useLocation().state)}</pre>
    </>
  )
}

function renderInvitation(hash = INVITATION_LINK_HASH) {
  return render(
    <MemoryRouter initialEntries={[`${PATHS.COMPANY_INVITATION}${hash}`]}>
      <SessionProvider>
        <Routes>
          <Route
            path={PATHS.COMPANY_INVITATION}
            element={
              <>
                <CompanyInvitation />
                <CurrentLocation />
              </>
            }
          />
          <Route path={PATHS.LOGIN} element={<LoginProbe />} />
          <Route path={PATHS.MEMBERS} element={<p>Meu acesso</p>} />
          <Route path={PATHS.HOME} element={<p>Início</p>} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  )
}

const loginState = () => JSON.parse(screen.getByTestId('login-state').textContent ?? 'null')
const storedToken = () => sessionStorage.getItem(INVITATION_STORAGE_KEY)

async function fillNewUserForm(
  user: ReturnType<typeof userEvent.setup>,
  {
    password = VALID_PASSWORD,
    confirmation = password,
    terms = true,
  }: { password?: string; confirmation?: string; terms?: boolean } = {},
) {
  await user.type(await screen.findByLabelText('Senha'), password)
  await user.type(screen.getByLabelText('Confirmar senha'), confirmation)
  if (terms) await user.click(screen.getByRole('checkbox'))
}

beforeEach(() => {
  clearInvitationToken()
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('CompanyInvitation — opening the link', () => {
  it('resolves the token from the fragment, removes it from the address bar and shows the read-only invitation', async () => {
    // Given an anonymous visitor opening the shared link
    const fetchMock = stubApi({ [RESOLVE]: json(resolvedInvitation) })

    // When the page loads
    renderInvitation()

    // Then the invitation data comes from the resolve contract and cannot be edited
    expect(
      await screen.findByRole('heading', {
        name: 'Você foi convidado para acessar Cooperativa AgroSul',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('João Rangel')).toBeInTheDocument()
    expect(screen.getByText('Mariana Costa (mariana@agrosul.com.br)')).toBeInTheDocument()
    expect(screen.getByText('Operador')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, RESOLVE)[0].body).toEqual({ token: INVITATION_TOKEN })
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/convites\/empresa$/)
    expect(storedToken()).toBe(INVITATION_TOKEN)
    expect(JSON.stringify({ ...localStorage })).not.toContain(INVITATION_TOKEN)
  })

  it.each(['', '#token=curto', '#outro=valor'])(
    'shows an invalid link without calling the API for the fragment "%s"',
    async (hash) => {
      const fetchMock = stubApi({})

      renderInvitation(hash)

      expect(
        await screen.findByRole('heading', { name: 'Link de convite inválido' }),
      ).toBeInTheDocument()
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it.each([
    [404, 'INVITATION_INVALID', 'Link de convite inválido'],
    [410, 'INVITATION_SUPERSEDED', 'Este link foi substituído'],
    [410, 'INVITATION_REVOKED', 'Convite revogado'],
    [409, 'INVITATION_ALREADY_USED', 'Convite já utilizado'],
  ])('explains a %i %s token, discards it and offers the login', async (status, code, title) => {
    const user = userEvent.setup()
    stubApi({ [RESOLVE]: apiError(status, code) })

    renderInvitation()

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    expect(storedToken()).toBeNull()
    await user.click(
      screen.getByRole('button', {
        name: code === 'INVITATION_ALREADY_USED' ? 'Entrar na minha conta' : 'Ir para o login',
      }),
    )
    expect(await screen.findByText('Página de login')).toBeInTheDocument()
  })

  it('keeps the token and retries after an API failure', async () => {
    const user = userEvent.setup()
    stubApi({ [RESOLVE]: [apiError(500, 'INTERNAL_ERROR'), json(resolvedInvitation)] })

    renderInvitation()

    expect(
      await screen.findByRole('heading', { name: 'Não foi possível carregar o convite' }),
    ).toBeInTheDocument()
    expect(storedToken()).toBe(INVITATION_TOKEN)
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('João Rangel')).toBeInTheDocument()
  })

  it('waits for Retry-After before allowing a new query after a 429', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    stubApi({
      [RESOLVE]: [
        apiError(429, 'RATE_LIMITED', 'Muitas tentativas.', { headers: { 'Retry-After': '5' } }),
        json(resolvedInvitation),
      ],
    })

    renderInvitation()

    expect(await screen.findByRole('heading', { name: 'Muitas tentativas' })).toBeInTheDocument()
    const retry = screen.getByRole('button', { name: 'Tentar novamente' })
    expect(retry).toBeDisabled()
    // Aplica os efeitos pendentes antes de controlar o relógio.
    await act(async () => {})
    act(() => vi.advanceTimersByTime(4000))
    expect(retry).toBeDisabled()
    act(() => vi.advanceTimersByTime(1500))
    expect(retry).toBeEnabled()

    act(() => retry.click())
    expect(await screen.findByText('João Rangel')).toBeInTheDocument()
  })
})

describe('CompanyInvitation — new user', () => {
  it('requires password, confirmation and the explicit terms acceptance, starting unchecked', async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi({ [RESOLVE]: json(resolvedInvitation) })
    renderInvitation()

    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Aceitar e acessar' }))

    expect(screen.getByText('Informe uma senha.')).toBeInTheDocument()
    expect(screen.getByText('Confirme a senha.')).toBeInTheDocument()
    expect(
      screen.getByText('Aceite os termos de uso e a política de privacidade.'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, ACCEPT_NEW)).toHaveLength(0)
  })

  it('does not submit without accepting the terms', async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi({ [RESOLVE]: json(resolvedInvitation) })
    renderInvitation()

    await fillNewUserForm(user, { terms: false })
    await user.click(screen.getByRole('button', { name: 'Aceitar e acessar' }))

    expect(
      screen.getByText('Aceite os termos de uso e a política de privacidade.'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, ACCEPT_NEW)).toHaveLength(0)
  })

  it.each([
    ['weak', 'senhafraca', 'Use ao menos 8 caracteres, um número e um caractere especial.'],
    [
      'above 72 bytes',
      `${'é'.repeat(36)}1!`,
      'A senha excede o tamanho máximo permitido. Use uma senha mais curta.',
    ],
  ])('rejects a %s password before calling the API', async (_scenario, password, message) => {
    const user = userEvent.setup()
    const fetchMock = stubApi({ [RESOLVE]: json(resolvedInvitation) })
    renderInvitation()

    await fillNewUserForm(user, { password })
    await user.click(screen.getByRole('button', { name: 'Aceitar e acessar' }))

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(requestsTo(fetchMock, ACCEPT_NEW)).toHaveLength(0)
  })

  it('rejects a confirmation that does not match', async () => {
    const user = userEvent.setup()
    stubApi({ [RESOLVE]: json(resolvedInvitation) })
    renderInvitation()

    await fillNewUserForm(user, { confirmation: 'Diferente123!' })
    await user.click(screen.getByRole('button', { name: 'Aceitar e acessar' }))

    expect(screen.getByText('Senha e confirmação não coincidem.')).toBeInTheDocument()
  })

  it('creates the access and opens the normal login with the invitation email, without creating a session', async () => {
    // Given a valid invitation for a new identity
    const user = userEvent.setup()
    const fetchMock = stubApi({
      [RESOLVE]: json(resolvedInvitation),
      [ACCEPT_NEW]: json(newUserAcceptance, { status: 201 }),
    })
    renderInvitation()

    // When the user defines the password, accepts the terms and confirms
    await fillNewUserForm(user)
    await user.click(screen.getByRole('button', { name: 'Aceitar e acessar' }))

    // Then the access is created from the invitation data and the normal login follows
    expect(await screen.findByText('Página de login')).toBeInTheDocument()
    expect(requestsTo(fetchMock, ACCEPT_NEW)[0].body).toEqual({
      token: INVITATION_TOKEN,
      password: VALID_PASSWORD,
      confirmPassword: VALID_PASSWORD,
      termsAccepted: true,
      termsVersion: 'v1',
    })
    expect(loginState()).toEqual({
      from: PATHS.MEMBERS,
      email: 'mariana@agrosul.com.br',
      notice: 'ACCOUNT_CREATED',
    })
    expect(getLoginToken()).toBeNull()
    expect(storedToken()).toBeNull()
    expect(screen.getByTestId('login-state').textContent).not.toContain(INVITATION_TOKEN)
  })

  it('sends a single request when the confirmation is clicked repeatedly', async () => {
    const user = userEvent.setup()
    let finish: (response: Response) => void = () => undefined
    const fetchMock = stubApi({
      [RESOLVE]: json(resolvedInvitation),
      [ACCEPT_NEW]: () => new Promise<Response>((resolve) => (finish = resolve)),
    })
    renderInvitation()
    await fillNewUserForm(user)

    const submit = screen.getByRole('button', { name: 'Aceitar e acessar' })
    await user.click(submit)
    await user.click(screen.getByRole('button', { name: 'Criando acesso...' }))

    expect(screen.getByRole('button', { name: 'Criando acesso...' })).toBeDisabled()
    expect(requestsTo(fetchMock, ACCEPT_NEW)).toHaveLength(1)
    await act(async () => finish(json(newUserAcceptance, { status: 201 })))
    expect(await screen.findByText('Página de login')).toBeInTheDocument()
  })

  it('switches to the login when the identity already exists, keeping the invitation', async () => {
    const user = userEvent.setup()
    stubApi({
      [RESOLVE]: json(resolvedInvitation),
      [ACCEPT_NEW]: apiError(409, 'USER_ALREADY_EXISTS'),
    })
    renderInvitation()

    await fillNewUserForm(user)
    await user.click(screen.getByRole('button', { name: 'Aceitar e acessar' }))

    expect(
      await screen.findByText(
        'Já existe uma conta com este e-mail. Entre na sua conta para aceitar o convite.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Entrar na minha conta' }))
    expect(loginState()).toEqual({
      from: PATHS.COMPANY_INVITATION,
      email: 'mariana@agrosul.com.br',
    })
    expect(storedToken()).toBe(INVITATION_TOKEN)
  })

  it('guides to the login when the invitation was already used, without registering again', async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi({
      [RESOLVE]: json(resolvedInvitation),
      [ACCEPT_NEW]: apiError(409, 'INVITATION_ALREADY_USED'),
    })
    renderInvitation()

    await fillNewUserForm(user)
    await user.click(screen.getByRole('button', { name: 'Aceitar e acessar' }))

    expect(await screen.findByRole('heading', { name: 'Convite já utilizado' })).toBeInTheDocument()
    expect(storedToken()).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Entrar na minha conta' }))
    expect(loginState()).toEqual({ from: PATHS.MEMBERS, email: 'mariana@agrosul.com.br' })
    expect(requestsTo(fetchMock, ACCEPT_NEW)).toHaveLength(1)
  })

  it('keeps the form and points to the field rejected by the backend', async () => {
    const user = userEvent.setup()
    stubApi({
      [RESOLVE]: json(resolvedInvitation),
      [ACCEPT_NEW]: apiError(422, 'PASSWORD_TOO_WEAK', 'Escolha uma senha mais forte.'),
    })
    renderInvitation()

    await fillNewUserForm(user)
    await user.click(screen.getByRole('button', { name: 'Aceitar e acessar' }))

    expect(await screen.findByText('Escolha uma senha mais forte.')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toHaveValue(VALID_PASSWORD)
  })

  it('reloads the current terms when the accepted version is outdated', async () => {
    const user = userEvent.setup()
    const updatedTerms = { ...resolvedInvitation.terms, version: 'v2' }
    const fetchMock = stubApi({
      [RESOLVE]: [json(resolvedInvitation), json({ ...resolvedInvitation, terms: updatedTerms })],
      [ACCEPT_NEW]: [apiError(409, 'TERMS_VERSION_MISMATCH'), json(newUserAcceptance)],
    })
    renderInvitation()

    await fillNewUserForm(user)
    await user.click(screen.getByRole('button', { name: 'Aceitar e acessar' }))

    expect(
      await screen.findByText(
        'Os termos de uso foram atualizados. Revise e aceite novamente para continuar.',
      ),
    ).toBeInTheDocument()
    expect(await screen.findByRole('checkbox')).not.toBeChecked()
    await fillNewUserForm(user)
    await user.click(screen.getByRole('button', { name: 'Aceitar e acessar' }))
    expect(await screen.findByText('Página de login')).toBeInTheDocument()
    expect(requestsTo(fetchMock, ACCEPT_NEW)[1].body?.termsVersion).toBe('v2')
  })

  it('blocks new attempts while the rate limit lasts', async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi({
      [RESOLVE]: json(resolvedInvitation),
      [ACCEPT_NEW]: apiError(429, 'RATE_LIMITED', 'Muitas tentativas.', {
        headers: { 'Retry-After': '30' },
      }),
    })
    renderInvitation()

    await fillNewUserForm(user)
    await user.click(screen.getByRole('button', { name: 'Aceitar e acessar' }))

    expect(
      await screen.findByText(
        'Muitas tentativas em pouco tempo. Aguarde 30 segundos e tente novamente.',
      ),
    ).toBeInTheDocument()
    const submit = screen.getByRole('button', { name: 'Aceitar e acessar' })
    expect(submit).toBeDisabled()
    await user.click(submit)
    expect(requestsTo(fetchMock, ACCEPT_NEW)).toHaveLength(1)
  })

  it('allows a new attempt and clears the warning once Retry-After has elapsed', async () => {
    // Given an acceptance rejected with a 2 second Retry-After
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const fetchMock = stubApi({
      [RESOLVE]: json(resolvedInvitation),
      [ACCEPT_NEW]: [
        apiError(429, 'RATE_LIMITED', 'Muitas tentativas.', { headers: { 'Retry-After': '2' } }),
        json(newUserAcceptance, { status: 201 }),
      ],
    })
    renderInvitation()
    await fillNewUserForm(user)
    await user.click(screen.getByRole('button', { name: 'Aceitar e acessar' }))
    const warning = 'Muitas tentativas em pouco tempo. Aguarde 2 segundos e tente novamente.'
    expect(await screen.findByText(warning)).toBeInTheDocument()

    // When the wait is over
    await act(async () => {})
    act(() => vi.advanceTimersByTime(2000))

    // Then the warning disappears and the user can confirm again
    expect(screen.queryByText(warning)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aceitar e acessar' }))
    expect(await screen.findByText('Página de login')).toBeInTheDocument()
    expect(requestsTo(fetchMock, ACCEPT_NEW)).toHaveLength(2)
  })

  it('shows a retryable message when the API fails', async () => {
    const user = userEvent.setup()
    stubApi({ [RESOLVE]: json(resolvedInvitation), [ACCEPT_NEW]: apiError(500, 'INTERNAL_ERROR') })
    renderInvitation()

    await fillNewUserForm(user)
    await user.click(screen.getByRole('button', { name: 'Aceitar e acessar' }))

    expect(
      await screen.findByText('Não foi possível concluir o aceite. Tente novamente.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aceitar e acessar' })).toBeEnabled()
    expect(storedToken()).toBe(INVITATION_TOKEN)
  })

  it('clears the invitation when the user cancels', async () => {
    const user = userEvent.setup()
    stubApi({ [RESOLVE]: json(resolvedInvitation) })
    renderInvitation()

    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByText('Página de login')).toBeInTheDocument()
    expect(storedToken()).toBeNull()
  })
})

describe('CompanyInvitation — existing user', () => {
  it('sends an anonymous user to the existing login with the invitation email, keeping the token for the 2FA return', async () => {
    const user = userEvent.setup()
    stubApi({ [RESOLVE]: json(existingUserInvitation) })
    renderInvitation()

    await user.click(await screen.findByRole('button', { name: 'Entrar na minha conta' }))

    expect(await screen.findByText('Página de login')).toBeInTheDocument()
    expect(loginState()).toEqual({
      from: PATHS.COMPANY_INVITATION,
      email: 'mariana@agrosul.com.br',
    })
    expect(screen.getByTestId('login-state').textContent).not.toContain(INVITATION_TOKEN)
    expect(storedToken()).toBe(INVITATION_TOKEN)
  })

  it('requires an explicit confirmation after login and refreshes the session before opening Meu acesso', async () => {
    // Given the invited user returning authenticated from the login
    const user = userEvent.setup()
    saveLoginToken(userJwt)
    sessionStorage.setItem(INVITATION_STORAGE_KEY, INVITATION_TOKEN)
    const fetchMock = stubApi({
      [RESOLVE]: json(existingUserInvitation),
      [ME]: [json(userWithoutCompany), json(userWithMembership)],
      [COMPANY]: json(companyProfile),
      [ACCEPT]: json(acceptedMember),
    })
    renderInvitation('')

    // When the page loads, nothing is accepted automatically
    expect(await screen.findByText(/Você está conectado como/)).toBeInTheDocument()
    expect(requestsTo(fetchMock, ACCEPT)).toHaveLength(0)

    // And confirming without the terms is blocked
    await user.click(screen.getByRole('button', { name: 'Confirmar e acessar' }))
    expect(
      screen.getByText('Aceite os termos de uso e a política de privacidade.'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, ACCEPT)).toHaveLength(0)

    // When the user accepts the terms and confirms
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Confirmar e acessar' }))

    // Then the session JWT confirms the link, the session reloads and Meu acesso opens
    expect(await screen.findByText('Meu acesso')).toBeInTheDocument()
    const [accept] = requestsTo(fetchMock, ACCEPT)
    expect(accept.body).toEqual({
      token: INVITATION_TOKEN,
      termsAccepted: true,
      termsVersion: 'v1',
    })
    expect(accept.headers.Authorization).toBe(`Bearer ${userJwt}`)
    await waitFor(() => expect(requestsTo(fetchMock, ME)).toHaveLength(2))
    await waitFor(() => expect(requestsTo(fetchMock, COMPANY)).toHaveLength(1))
    expect(storedToken()).toBeNull()
  })

  it('treats a repeated acceptance of the same active link as success', async () => {
    const user = userEvent.setup()
    saveLoginToken(userJwt)
    sessionStorage.setItem(INVITATION_STORAGE_KEY, INVITATION_TOKEN)
    stubApi({
      [RESOLVE]: json(existingUserInvitation),
      [ME]: [json(userWithoutCompany), json(userWithMembership)],
      [COMPANY]: json(companyProfile),
      [ACCEPT]: json(acceptedMember),
    })
    renderInvitation('')

    await user.click(await screen.findByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Confirmar e acessar' }))

    expect(await screen.findByText('Meu acesso')).toBeInTheDocument()
  })

  it('does not reactivate access when a repeated acceptance reports the link as used', async () => {
    const user = userEvent.setup()
    saveLoginToken(userJwt)
    sessionStorage.setItem(INVITATION_STORAGE_KEY, INVITATION_TOKEN)
    stubApi({
      [RESOLVE]: json(existingUserInvitation),
      [ME]: json(userWithoutCompany),
      [ACCEPT]: apiError(409, 'INVITATION_ALREADY_USED'),
    })
    renderInvitation('')

    await user.click(await screen.findByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Confirmar e acessar' }))

    expect(await screen.findByRole('heading', { name: 'Convite já utilizado' })).toBeInTheDocument()
    expect(storedToken()).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Ir para o início' }))
    expect(await screen.findByText('Início')).toBeInTheDocument()
  })

  it('does not accept with a different identity and lets the user switch accounts without exposing the company', async () => {
    const user = userEvent.setup()
    saveLoginToken(userJwt)
    sessionStorage.setItem(INVITATION_STORAGE_KEY, INVITATION_TOKEN)
    const fetchMock = stubApi({
      [RESOLVE]: json(existingUserInvitation),
      [ME]: json({ ...userWithoutCompany, email: 'outra.pessoa@empresa.com' }),
    })
    renderInvitation('')

    expect(
      await screen.findByRole('heading', { name: 'Este convite é para outra conta' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Cooperativa AgroSul/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmar e acessar' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Trocar de conta' }))

    expect(getLoginToken()).toBeNull()
    expect(await screen.findByRole('button', { name: 'Entrar na minha conta' })).toBeInTheDocument()
    expect(requestsTo(fetchMock, ACCEPT)).toHaveLength(0)
    expect(storedToken()).toBe(INVITATION_TOKEN)
  })

  it('treats a matching email with different casing as the invited identity', async () => {
    saveLoginToken(userJwt)
    sessionStorage.setItem(INVITATION_STORAGE_KEY, INVITATION_TOKEN)
    stubApi({
      [RESOLVE]: json(existingUserInvitation),
      [ME]: json({ ...userWithoutCompany, email: ' Mariana@AgroSul.com.br ' }),
    })
    renderInvitation('')

    expect(await screen.findByRole('button', { name: 'Confirmar e acessar' })).toBeInTheDocument()
  })

  it('shows the identity mismatch reported by the backend', async () => {
    const user = userEvent.setup()
    saveLoginToken(userJwt)
    sessionStorage.setItem(INVITATION_STORAGE_KEY, INVITATION_TOKEN)
    stubApi({
      [RESOLVE]: json(existingUserInvitation),
      [ME]: json(userWithoutCompany),
      [ACCEPT]: apiError(403, 'INVITATION_IDENTITY_MISMATCH'),
    })
    renderInvitation('')

    await user.click(await screen.findByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Confirmar e acessar' }))

    expect(
      await screen.findByRole('heading', { name: 'Este convite é para outra conta' }),
    ).toBeInTheDocument()
    expect(storedToken()).toBe(INVITATION_TOKEN)
  })

  it('does not let a platform administrator accept the invitation', async () => {
    saveLoginToken(adminJwt)
    sessionStorage.setItem(INVITATION_STORAGE_KEY, INVITATION_TOKEN)
    stubApi({
      [RESOLVE]: json(existingUserInvitation),
      [ME]: json({ ...userWithoutCompany, accountType: 'ADMIN', roles: ['ROLE_ADMIN'] }),
    })
    renderInvitation('')

    expect(
      await screen.findByRole('heading', { name: 'Contas administrativas não aceitam convites' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmar e acessar' })).not.toBeInTheDocument()
  })

  it('explains a company conflict and discards the invitation', async () => {
    const user = userEvent.setup()
    saveLoginToken(userJwt)
    sessionStorage.setItem(INVITATION_STORAGE_KEY, INVITATION_TOKEN)
    stubApi({
      [RESOLVE]: json(existingUserInvitation),
      [ME]: json(userWithoutCompany),
      [ACCEPT]: apiError(409, 'USER_IN_OTHER_COMPANY'),
    })
    renderInvitation('')

    await user.click(await screen.findByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Confirmar e acessar' }))

    expect(
      await screen.findByRole('heading', { name: 'Conta vinculada a outra empresa' }),
    ).toBeInTheDocument()
    expect(storedToken()).toBeNull()
  })

  it('opens Meu acesso when the user already belongs to the company', async () => {
    const user = userEvent.setup()
    saveLoginToken(userJwt)
    sessionStorage.setItem(INVITATION_STORAGE_KEY, INVITATION_TOKEN)
    stubApi({
      [RESOLVE]: json(existingUserInvitation),
      [ME]: [json(userWithoutCompany), json(userWithMembership)],
      [COMPANY]: json(companyProfile),
      [ACCEPT]: apiError(409, 'MEMBER_ALREADY_EXISTS'),
    })
    renderInvitation('')

    await user.click(await screen.findByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Confirmar e acessar' }))
    await user.click(await screen.findByRole('button', { name: 'Abrir meu acesso' }))

    expect(await screen.findByText('Meu acesso')).toBeInTheDocument()
  })

  it('returns to the login prompt when the session expires during the confirmation', async () => {
    const user = userEvent.setup()
    saveLoginToken(userJwt)
    sessionStorage.setItem(INVITATION_STORAGE_KEY, INVITATION_TOKEN)
    stubApi({
      [RESOLVE]: json(existingUserInvitation),
      [ME]: json(userWithoutCompany),
      [ACCEPT]: apiError(401, 'TOKEN_EXPIRED'),
    })
    renderInvitation('')

    await user.click(await screen.findByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Confirmar e acessar' }))

    expect(
      await screen.findByText('Sua sessão expirou. Entre novamente para confirmar o convite.'),
    ).toBeInTheDocument()
    expect(getLoginToken()).toBeNull()
    expect(screen.getByRole('button', { name: 'Entrar na minha conta' })).toBeInTheDocument()
    expect(storedToken()).toBe(INVITATION_TOKEN)
  })

  it('offers a retry when the account data cannot be loaded', async () => {
    const user = userEvent.setup()
    saveLoginToken(userJwt)
    sessionStorage.setItem(INVITATION_STORAGE_KEY, INVITATION_TOKEN)
    stubApi({
      [RESOLVE]: json(existingUserInvitation),
      [ME]: [apiError(500, 'INTERNAL_ERROR'), json(userWithoutCompany)],
    })
    renderInvitation('')

    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('button', { name: 'Confirmar e acessar' })).toBeInTheDocument()
  })
})
