import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PATHS } from '@/routes/paths'
import { authService } from '@/services/login'
import { Login } from './Login'

vi.mock('@/services/login', () => ({
  authService: {
    login: vi.fn(),
  },
}))

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={[PATHS.LOGIN]}>
      <Routes>
        <Route path={PATHS.HOME} element={<p>Home page</p>} />
        <Route path={PATHS.ADMIN_CLIENTS} element={<p>Admin page</p>} />
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
  })

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
    renderLogin()

    await user.click(screen.getByRole('link', { name: 'Esqueci minha senha' }))
    expect(await screen.findByText('Forgot Password page')).toBeInTheDocument()
  })

  it('stores the token and navigates admins to the clients page', async () => {
    const user = userEvent.setup()
    const mockAdminToken = 'header.eyJyb2xlIjpbIkFETUlOIl19.signature'
    vi.mocked(authService.login).mockResolvedValueOnce({ token: mockAdminToken })
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'admin@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-valida')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Admin page')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBe(mockAdminToken)
  })

  it('stores the token and navigates users to the home page', async () => {
    const user = userEvent.setup()
    const mockUserToken = 'header.eyJyb2xlIjpbIlVTRVIiXX0=.signature'
    vi.mocked(authService.login).mockResolvedValueOnce({ token: mockUserToken })
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'cliente@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-valida')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBe(mockUserToken)
  })

  it('shows and clears credential errors after a failed login', async () => {
    const user = userEvent.setup()
    vi.mocked(authService.login).mockRejectedValueOnce(new Error('Unauthorized'))
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

  it('navigates to the register page when "Cadastrar PME" is clicked', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Cadastrar PME' }))

    expect(await screen.findByText('Register page')).toBeInTheDocument()
  })
})
