import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PATHS } from '@/routes/paths'
import { ApiError } from '@/services/api'
import { getAccessToken, saveAccessToken } from '@/services/authToken'
import { authService } from '@/services/login'
import { getCurrentOnboarding } from '@/services/onboarding'
import { adminToken, userToken } from '@/test/jwt'
import { Login } from './Login'

vi.mock('@/services/login', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/login')>()),
  authService: {
    login: vi.fn(),
  },
}))

vi.mock('@/services/onboarding', () => ({
  getCurrentOnboarding: vi.fn(),
}))

function renderLogin(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: PATHS.LOGIN, state }]}>
      <Routes>
        <Route path={PATHS.HOME} element={<p>Home page</p>} />
        <Route path={PATHS.ADMIN_CLIENTS} element={<p>Admin page</p>} />
        <Route path={PATHS.BENEFICIARIES} element={<p>Client area</p>} />
        <Route path={PATHS.REGISTER_COMPLIANCE} element={<p>Compliance step</p>} />
        <Route path={PATHS.REGISTER} element={<p>Register page</p>} />
        <Route path={PATHS.FORGOT_PASSWORD} element={<p>Forgot Password page</p>} />
        <Route path={PATHS.LOGIN} element={<Login />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Login Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    vi.mocked(getCurrentOnboarding).mockResolvedValue({
      kycVerificationId: 'kyc-1',
      companyId: 'c1',
      status: 'UNDER_REVIEW',
      documentSubmitted: true,
      livenessSubmitted: true,
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('renders the brand copy, heading and form fields', () => {
    renderLogin()

    expect(
      screen.getByText('Infraestrutura financeira para operações globais.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bem-vindo à V-Stable!' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
  })

  it('shows validation errors when submitting an empty form', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('E-mail é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Senha é obrigatória')).toBeInTheDocument()
  })

  it('shows an error when the email format is invalid', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'nao-e-um-email')
    await user.type(screen.getByLabelText('Senha'), '123456')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('E-mail inválido')).toBeInTheDocument()
  })

  it('clears a field error as the user retypes it', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.getByText('E-mail é obrigatório')).toBeInTheDocument()

    await user.type(screen.getByLabelText('E-mail'), 'a')
    expect(screen.queryByText('E-mail é obrigatório')).not.toBeInTheDocument()
  })

  it('navigates to the forgot password page when the link is clicked', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: { Authorization: 'Bearer token123' },
        }),
      ),
    )
    renderLogin()

    await user.click(screen.getByRole('link', { name: 'Esqueci minha senha' }))
    expect(await screen.findByText('Forgot Password page')).toBeInTheDocument()
  })

  async function submit(user: ReturnType<typeof userEvent.setup>, email = 'cliente@empresa.com') {
    await user.type(screen.getByLabelText('E-mail'), email)
    await user.type(screen.getByLabelText('Senha'), 'senha-valida')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
  }

  it('stores the token in the shared session and navigates admins to the clients page', async () => {
    const user = userEvent.setup()
    const token = adminToken()
    vi.mocked(authService.login).mockResolvedValueOnce({ token })
    renderLogin()

    await submit(user, 'admin@vstable.com')

    expect(await screen.findByText('Admin page')).toBeInTheDocument()
    expect(getAccessToken()).toBe(token)
    expect(localStorage.getItem('token')).toBeNull()
    expect(getCurrentOnboarding).not.toHaveBeenCalled()
  })

  it('navigates company users with a finished registration to the client area', async () => {
    const user = userEvent.setup()
    const token = userToken()
    vi.mocked(authService.login).mockResolvedValueOnce({ token })
    renderLogin()

    await submit(user)

    expect(await screen.findByText('Client area')).toBeInTheDocument()
    expect(getAccessToken()).toBe(token)
  })

  it('resumes an interrupted registration at the missing step', async () => {
    const user = userEvent.setup()
    vi.mocked(authService.login).mockResolvedValueOnce({ token: userToken() })
    vi.mocked(getCurrentOnboarding).mockResolvedValueOnce({
      kycVerificationId: 'kyc-1',
      companyId: 'c1',
      status: 'PENDING',
      documentSubmitted: false,
      livenessSubmitted: false,
    })
    renderLogin()

    await submit(user)

    expect(await screen.findByText('Compliance step')).toBeInTheDocument()
  })

  it('discards data from a previous account on login', async () => {
    const user = userEvent.setup()
    saveAccessToken('previous-account-token')
    sessionStorage.setItem('vstable:onboarding:representative-personal-data', '{"cpf":"1"}')
    vi.mocked(authService.login).mockResolvedValueOnce({ token: userToken() })
    renderLogin()

    await submit(user)

    expect(await screen.findByText('Client area')).toBeInTheDocument()
    expect(sessionStorage.getItem('vstable:onboarding:representative-personal-data')).toBeNull()
  })

  it('shows and clears credential errors after a failed login', async () => {
    const user = userEvent.setup()
    vi.mocked(authService.login).mockRejectedValueOnce(
      new ApiError(401, 'E-mail ou senha inválidos'),
    )
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'usuario@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-super-secreta')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findAllByText('E-mail ou senha inválidos')).toHaveLength(2)
    await user.type(screen.getByLabelText('E-mail'), 'x')
    expect(screen.getAllByText('E-mail ou senha inválidos')).toHaveLength(1)
    await user.type(screen.getByLabelText('Senha'), 'x')
    expect(screen.queryByText('E-mail ou senha inválidos')).not.toBeInTheDocument()
  })

  it('shows blocked-account and server errors without blaming the credentials', async () => {
    const user = userEvent.setup()
    vi.mocked(authService.login).mockRejectedValueOnce(
      new ApiError(423, 'Usuário bloqueado. Entre em contato com o suporte.'),
    )
    renderLogin()

    await submit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário bloqueado')
    expect(screen.queryByText('E-mail ou senha inválidos')).not.toBeInTheDocument()
  })

  it('explains that the session expired when redirected after a 401', () => {
    renderLogin({ from: PATHS.BENEFICIARIES, reason: 'expired' })

    expect(
      screen.getByText('Sua sessão expirou. Entre novamente para continuar.'),
    ).toBeInTheDocument()
  })

  it('navigates to the register page when "Cadastrar PME" is clicked', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Cadastrar PME' }))

    expect(await screen.findByText('Register page')).toBeInTheDocument()
  })
})
