import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSession } from '@/features/auth'
import type { Session } from '@/features/auth/model/useSession'
import { RegisterStatus } from '@/features/onboarding/pages/RegisterStatus/RegisterStatus'
import { saveAccessToken } from '@/shared/http/authToken'
import { PATHS } from '@/shared/navigation/paths'

vi.mock('@/features/auth', async () => ({
  ...(await vi.importActual<typeof import('@/features/auth')>('@/features/auth')),
  useSession: vi.fn(),
}))

const anonymous: Session = {
  status: 'anonymous',
  user: null,
  company: null,
  error: null,
  retry: vi.fn(),
}

const onboarding = {
  kycVerificationId: 'kyc-1',
  companyId: 'c1',
  status: 'UNDER_REVIEW',
  documentSubmitted: true,
  livenessSubmitted: true,
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function LoginProbe() {
  const state = useLocation().state as { from?: string } | null
  return <p>Login page from {state?.from}</p>
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[PATHS.REGISTER_STATUS]}>
      <Routes>
        <Route path={PATHS.REGISTER_STATUS} element={<RegisterStatus />} />
        <Route path={PATHS.LOGIN} element={<LoginProbe />} />
        <Route path={PATHS.REGISTER} element={<p>Register page</p>} />
        <Route path="/register/:id/compliance" element={<p>Compliance page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function stubApi(onboardingResponse: Response, companyStatus: string | null = 'UNDER_REVIEW') {
  const fetcher = vi.fn(async (url: string) => {
    if (url.endsWith('/v1/onboarding/me')) return onboardingResponse.clone()
    if (url.endsWith('/v1/auth/2fa/setup'))
      return json({ otpauthUri: 'otpauth://totp/V-Stable:u1?secret=JBSWY3DPEHPK3PXP' })
    return json({ overallStatus: companyStatus })
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

describe('RegisterStatus Page Component', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    // Representante com 2FA já ativo: o card mostra a situação do cadastro.
    vi.mocked(useSession).mockReturnValue(anonymous)
    saveAccessToken(`header.${btoa(JSON.stringify({ sub: 'u1' }))}.signature`)
    localStorage.setItem('vstable_2fa_active_u1', 'true')
  })

  afterEach(() => vi.unstubAllGlobals())

  it('given a registration under review, when rendered, then it shows the review card and the support text', async () => {
    stubApi(json(onboarding))

    renderPage()

    expect(await screen.findByText('Seu cadastro está em análise')).toBeInTheDocument()
    expect(
      screen.getByText('Precisa de ajuda? Entre em contato com o suporte da V-Stable.'),
    ).toBeInTheDocument()
  })

  it('given KYC and company approved, when rendered, then it shows the approved card', async () => {
    stubApi(json({ ...onboarding, status: 'APPROVED' }), 'APPROVED')

    renderPage()

    expect(await screen.findByText('Cadastro aprovado')).toBeInTheDocument()
  })

  it('given a rejected company, when rendered, then it shows the not approved card', async () => {
    stubApi(json({ ...onboarding, status: 'APPROVED' }), 'REJECTED')

    renderPage()

    expect(await screen.findByText('Cadastro não aprovado')).toBeInTheDocument()
  })

  it('given a company status failure, when rendered, then the registration stays under review', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/v1/onboarding/me')
          ? json({ ...onboarding, status: 'APPROVED' })
          : json({}, 500),
      ),
    )

    renderPage()

    expect(await screen.findByText('Seu cadastro está em análise')).toBeInTheDocument()
  })

  it('given a pending document, when rendered, then it resumes the registration', async () => {
    stubApi(json({ ...onboarding, status: 'PENDING', documentSubmitted: false }))

    renderPage()

    expect(await screen.findByText('Compliance page')).toBeInTheDocument()
  })

  it('given no authenticated session, when rendered, then it sends the user to login and back', async () => {
    stubApi(json({}, 401))

    renderPage()

    expect(await screen.findByText(`Login page from ${PATHS.REGISTER_STATUS}`)).toBeInTheDocument()
  })

  it('given an account without registration, when rendered, then it offers to start one', async () => {
    const user = userEvent.setup()
    stubApi(json({}, 404))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Nenhum cadastro foi encontrado')
    await user.click(screen.getByRole('button', { name: 'Iniciar cadastro' }))

    expect(await screen.findByText('Register page')).toBeInTheDocument()
  })

  it('given a server failure, when retrying, then it loads the status again', async () => {
    const user = userEvent.setup()
    const fetcher = stubApi(json({}, 500))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar')
    fetcher.mockImplementation(async (url: string) =>
      url.endsWith('/v1/onboarding/me') ? json(onboarding) : json({ overallStatus: null }),
    )
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Seu cadastro está em análise')).toBeInTheDocument()
  })

  it('given the review card, when "Atualizar status" is clicked, then it queries the backend again', async () => {
    const user = userEvent.setup()
    const fetcher = stubApi(json(onboarding))
    renderPage()
    await screen.findByText('Seu cadastro está em análise')
    const callsBefore = fetcher.mock.calls.length

    await user.click(screen.getByRole('button', { name: 'Atualizar status' }))

    await waitFor(() => expect(fetcher.mock.calls.length).toBeGreaterThan(callsBefore))
    expect(await screen.findByText('Seu cadastro está em análise')).toBeInTheDocument()
  })

  it('given a registration under review without 2FA, when rendered, then it asks to activate 2FA first', async () => {
    localStorage.removeItem('vstable_2fa_active_u1')
    stubApi(json(onboarding))

    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Ativação de Segurança Obrigatória' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Em análise')).toBeInTheDocument()
  })

  it('given a logged user with 2FA active in the backend, when rendered, then it shows the status without asking for activation', async () => {
    localStorage.removeItem('vstable_2fa_active_u1')
    vi.mocked(useSession).mockReturnValue({
      ...anonymous,
      status: 'authenticated',
      user: {
        id: 'u1',
        name: 'Marina Costa',
        email: 'marina@empresa.com',
        companyId: 'c1',
        accountType: 'USER',
        roles: ['ROLE_USER'],
        twoFactorEnabled: true,
      },
    })
    stubApi(json(onboarding))

    renderPage()

    expect(await screen.findByText('Seu cadastro está em análise')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Ativação de Segurança Obrigatória' }),
    ).not.toBeInTheDocument()
  })

  it('given the session still loading, when the status arrives, then it waits before showing the card', async () => {
    vi.mocked(useSession).mockReturnValue({ ...anonymous, status: 'loading' })
    const fetcher = stubApi(json(onboarding))

    renderPage()

    await waitFor(() => expect(fetcher).toHaveBeenCalled())
    expect(screen.getByRole('status')).toHaveTextContent('Carregando a situação do cadastro...')
    expect(screen.queryByText('Seu cadastro está em análise')).not.toBeInTheDocument()
  })
})
