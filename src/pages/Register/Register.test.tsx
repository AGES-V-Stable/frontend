import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PATHS } from '@/routes/paths'

import { Register } from './Register'

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

afterEach(() => vi.unstubAllGlobals())

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={[PATHS.REGISTER]}>
      <Routes>
        <Route path={PATHS.HOME} element={<p>Home</p>} />
        <Route path={PATHS.REGISTER} element={<Register />} />
        <Route path={PATHS.REGISTER_COMPLIANCE} element={<p>Compliance screen</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillRepresentativeStep(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/nome completo/i), 'Maria da Silva')
  await user.type(screen.getByLabelText(/e-mail/i), 'maria@empresa.com')
  await user.type(screen.getByLabelText(/^senha/i), 'Senha@123')
  await user.type(screen.getByLabelText(/confirmar senha/i), 'Senha@123')
  await user.selectOptions(screen.getByLabelText(/cargo \/ função/i), 'Sócio-administrador')
  await user.type(screen.getByPlaceholderText('000.000.000-00'), '52998224725')
  fireEvent.change(screen.getByLabelText(/data de nascimento/i), {
    target: { value: '1990-05-20' },
  })
  await user.type(screen.getByLabelText(/telefone/i), '11987654321')
  await user.type(screen.getByPlaceholderText('00000-000'), '90000000')
  await user.type(screen.getByLabelText(/linha de endereço/i), 'Rua Teste, 100')
  await user.type(screen.getByLabelText(/cidade/i), 'São Paulo')
  await user.selectOptions(screen.getByLabelText(/estado/i), 'SP')
  await user.click(screen.getByRole('button', { name: /continuar/i }))
}

async function fillCompanyStep(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: 'Cadastro Institucional' })
  await user.type(screen.getByRole('textbox', { name: 'Razão Social *' }), 'Empresa Ltda')
  await user.type(screen.getByRole('textbox', { name: 'CNPJ *' }), '11222333000181')
  await user.type(screen.getByRole('textbox', { name: 'CEP *' }), '90000000')
  await user.type(screen.getByRole('textbox', { name: 'Estado *' }), 'RS')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
}

describe('Register wizard', () => {
  it('given the wizard is opened, when it first renders, then it should show the representative step', () => {
    renderRegister()

    expect(screen.getByText('Representante').closest('li')).toHaveAttribute('aria-current', 'step')
  })

  it('given the representative step is filled, when the user continues, then it should advance to the company step without calling the backend', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderRegister()

    await fillRepresentativeStep(user)

    expect(
      await screen.findByRole('heading', { name: 'Cadastro Institucional' }),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('given both steps are filled, when the company step is submitted, then it should call onboarding once with the combined payload and navigate to compliance', async () => {
    const fetchMock = vi.fn<(url: string, options?: RequestInit) => Promise<Response>>(async () =>
      response({
        userId: 'user-1',
        companyId: 'company-1',
        kycVerificationId: 'kyc-1',
        accessToken: 'jwt-token-1',
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderRegister()

    await fillRepresentativeStep(user)
    await fillCompanyStep(user)

    expect(await screen.findByText('Compliance screen')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]!
    expect(url).toBe('/v1/onboarding')
    expect(JSON.parse(options!.body as string)).toEqual({
      fullName: 'Maria da Silva',
      email: 'maria@empresa.com',
      password: 'Senha@123',
      confirmPassword: 'Senha@123',
      legalName: 'Empresa Ltda',
      cnpj: '11222333000181',
      country: 'Brasil',
      zipCode: '90000000',
      state: 'RS',
    })
  })

  it('given onboarding fails, when the company step is submitted, then it should show the server error and stay on the company step', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ message: 'CNPJ já cadastrado' }, 409)),
    )
    const user = userEvent.setup()
    renderRegister()

    await fillRepresentativeStep(user)
    await fillCompanyStep(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('CNPJ já cadastrado')
    expect(screen.getByRole('heading', { name: 'Cadastro Institucional' })).toBeInTheDocument()
  })

  it('given the user is on the company step, when clicking Cancelar, then it should return to the representative step', async () => {
    const user = userEvent.setup()
    renderRegister()

    await fillRepresentativeStep(user)
    await screen.findByRole('heading', { name: 'Cadastro Institucional' })
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByText('Representante').closest('li')).toHaveAttribute('aria-current', 'step')
  })

  it('given the user is on the representative step, when clicking Voltar, then it should navigate home', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.click(screen.getByRole('button', { name: /voltar/i }))

    await waitFor(() => expect(screen.getByText('Home')).toBeInTheDocument())
  })
})
