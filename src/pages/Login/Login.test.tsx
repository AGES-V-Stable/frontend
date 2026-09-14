import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Login } from './Login'
import { authService } from '@/services/login'
import { PATHS } from '@/routes/paths'

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
  // Limpa os mocks antes de cada teste para o ADMIN não interferir no USER
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('navigates to the admin clients page when role array contains ADMIN', async () => {
    const user = userEvent.setup()

    // Payload mock: { "role": ["ADMIN"] } em Base64
    const mockAdminToken = 'header.eyJyb2xlIjpbIkFETUlOIl19.signature'
    vi.mocked(authService.login).mockResolvedValueOnce({ token: mockAdminToken })

    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'admin@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-valida')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Admin page')).toBeInTheDocument()
  })

  it('navigates to the home page when role array contains USER', async () => {
    const user = userEvent.setup()

    // Payload mock: { "role": ["USER"] } em Base64
    const mockUserToken = 'header.eyJyb2xlIjpbIlVTRVIiXX0=.signature'
    vi.mocked(authService.login).mockResolvedValueOnce({ token: mockUserToken })

    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'cliente@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-valida')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })

  it('shows generic invalid credentials error when API fails', async () => {
    const user = userEvent.setup()
    vi.mocked(authService.login).mockRejectedValueOnce(new Error('Unauthorized'))

    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'usuario@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findAllByText('E-mail ou senha inválidos')).toHaveLength(2)
  })

  it('navigates to the register page when "Cadastrar PME" is clicked', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Cadastrar PME' }))

    expect(await screen.findByText('Register page')).toBeInTheDocument()
  })
})
