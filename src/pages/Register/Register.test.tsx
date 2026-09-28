import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PATHS } from '@/routes/paths'

import { Register } from './Register'

afterEach(() => vi.unstubAllGlobals())

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={[PATHS.REGISTER]}>
      <Routes>
        <Route path={PATHS.LOGIN} element={<p>Login page</p>} />
        <Route path={PATHS.REGISTER} element={<Register />} />
        <Route path={PATHS.REGISTER_COMPANY} element={<p>Company registration</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillValidForm(email = 'user@sub.example.com') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Nome completo'), 'Maria Silva')
  await user.type(screen.getByLabelText('E-mail'), email)
  await user.type(screen.getByLabelText('Senha'), 'segura123!')
  await user.type(screen.getByLabelText('Confirmar senha'), 'segura123!')
  return user
}

describe('Register Page Component', () => {
  it('renders the access form', () => {
    renderRegister()

    expect(screen.getByRole('heading', { name: 'Dados de acesso' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar senha')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar ao login' })).toHaveAttribute('href', '/login')
    expect(screen.getByText('Acesso').closest('li')).toHaveAttribute('aria-current', 'step')
  })

  it('validates every access field and clears errors as values change', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Informe seu nome completo')).toBeInTheDocument()
    expect(screen.getByText('Informe um e-mail válido')).toBeInTheDocument()
    expect(
      screen.getByText('Use ao menos 8 caracteres, um número e um caractere especial'),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText('Nome completo'), 'M')
    await user.type(screen.getByLabelText('E-mail'), 'invalid')
    await user.type(screen.getByLabelText('Senha'), 'password1')
    await user.type(screen.getByLabelText('Confirmar senha'), 'different')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.queryByText('Informe seu nome completo')).not.toBeInTheDocument()
    expect(screen.getByText('Informe um e-mail válido')).toBeInTheDocument()
    expect(
      screen.getByText('Use ao menos 8 caracteres, um número e um caractere especial'),
    ).toBeInTheDocument()
    expect(screen.getByText('Senha e confirmação não coincidem')).toBeInTheDocument()
  })

  it('rejects an invalid email without navigating', async () => {
    renderRegister()
    const user = await fillValidForm('user@example..com')

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('Informe um e-mail válido')).toBeInTheDocument()
    expect(screen.queryByText('Company registration')).not.toBeInTheDocument()
  })

  it('given a valid form, when submitted, then it should navigate to the company step without calling the backend', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderRegister()
    const user = await fillValidForm()

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('Company registration')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
