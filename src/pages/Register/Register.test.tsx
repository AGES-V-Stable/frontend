import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Register } from './Register'

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => vi.unstubAllGlobals())

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/register/:id/empresa" element={<p>Company registration</p>} />
        <Route path="/login" element={<p>Login page</p>} />
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

  it('rejects empty domain labels without calling the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderRegister()
    const user = await fillValidForm('user@example..com')

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('Informe um e-mail válido')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('creates the registration once and navigates for a valid subdomain email', async () => {
    let finish!: (value: Response) => void
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderRegister()
    const user = await fillValidForm()

    await user.dblClick(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByRole('button', { name: 'Criando acesso...' })).toBeDisabled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/cadastros/representante/acesso',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
        body: JSON.stringify({
          nomeCompleto: 'Maria Silva',
          email: 'user@sub.example.com',
          senha: 'segura123!',
          confirmarSenha: 'segura123!',
        }),
      }),
    )

    finish(response({ token: 'registration-id' }, 201))
    expect(await screen.findByText('Company registration')).toBeInTheDocument()
  })

  it('shows an API message for a client error and clears it on edit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ message: 'E-mail já cadastrado' }, 409)),
    )
    renderRegister()
    const user = await fillValidForm()

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail já cadastrado')

    await user.type(screen.getByLabelText('Nome completo'), 'a')
    expect(screen.queryByText('E-mail já cadastrado')).not.toBeInTheDocument()
  })

  it.each([
    ['server error', async () => response({ message: 'Falha interna' }, 500)],
    ['network error', async () => Promise.reject(new TypeError('offline'))],
  ])('shows the generic message after a %s', async (_name, request) => {
    vi.stubGlobal('fetch', vi.fn(request))
    renderRegister()
    const user = await fillValidForm()

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível iniciar o cadastro. Tente novamente.',
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled())
  })
})
