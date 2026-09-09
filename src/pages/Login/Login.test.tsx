import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { Login } from './Login'

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/" element={<p>Home page</p>} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Login Page Component', () => {
  it('renders the brand, heading and form fields', () => {
    renderLogin()

    expect(screen.getByText('V-STABLE')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Entrar na sua conta' })).toBeInTheDocument()
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

  it('navigates to the home page after a valid submission', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'usuario@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-super-secreta')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })

  it('navigates to the home page when "Voltar" is clicked', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })
})
