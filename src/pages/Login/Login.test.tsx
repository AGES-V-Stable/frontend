import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { Login } from './Login'
import { authService } from '@/services/login'

vi.mock('@/services/login', () => ({
  authService: {
    login: vi.fn(),
  },
}))

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/" element={<p>Home page</p>} />
        <Route path="/admin/clientes-pme" element={<p>Admin page</p>} />
        <Route path="/register" element={<p>Register page</p>} />
        <Route path="/esqueci-a-senha" element={<p> Forgot PassWord page </p>} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Login Page Component', () => {
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

    // Payload mock: { "role": ["ADMIN"] } em Base64
    const mockAdminToken = 'header.eyJyb2xlIjpbIkFETUlOIl19.signature'
    vi.mocked(authService.login).mockResolvedValueOnce({ token: mockAdminToken })

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

  it('clears a field error as the user retypes it', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.getByText('E-mail é obrigatório')).toBeInTheDocument()

    await user.type(screen.getByLabelText('E-mail'), 'a')
    expect(screen.queryByText('E-mail é obrigatório')).not.toBeInTheDocument()
  })

  it('navigates to the home page after a valid submission', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'usuario@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-super-secreta')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })

  it('navigates to the register page when "Cadastrar PME" is clicked, without requiring valid data', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Cadastrar PME' }))

    expect(await screen.findByText('Register page')).toBeInTheDocument()
  })
})
