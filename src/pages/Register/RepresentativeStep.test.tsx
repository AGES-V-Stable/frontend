import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import { RepresentativeStep } from './RepresentativeStep'
import type { RepresentativeData } from '@/types/onboarding'

const validPersonal = {
  cargoFuncao: 'Sócio-administrador',
  participacaoSocietaria: 0,
  cpf: '52998224725',
  dateOfBirth: '1990-05-20',
  phone: '11987654321',
  cep: '90000000',
  cidade: 'São Paulo',
  estado: 'SP',
  pais: 'Brasil',
  linhaEndereco: 'Rua Teste, 100',
}
const validAccess = {
  fullName: 'Maria da Silva',
  email: 'maria@empresa.com',
  password: 'Senha@123',
  confirmPassword: 'Senha@123',
}

async function fillAll(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/nome completo/i), validAccess.fullName)
  await user.type(screen.getByLabelText(/e-mail/i), validAccess.email)
  await user.type(screen.getByLabelText(/^senha/i), validAccess.password)
  await user.type(screen.getByLabelText(/confirmar senha/i), validAccess.confirmPassword)
  await user.selectOptions(screen.getByLabelText(/cargo \/ função/i), validPersonal.cargoFuncao)
  await user.type(screen.getByPlaceholderText('000.000.000-00'), validPersonal.cpf)
  fireEvent.change(screen.getByLabelText(/data de nascimento/i), {
    target: { value: validPersonal.dateOfBirth },
  })
  await user.type(screen.getByLabelText(/telefone/i), validPersonal.phone)
  await user.type(screen.getByPlaceholderText('00000-000'), validPersonal.cep)
  await user.type(screen.getByLabelText(/linha de endereço/i), validPersonal.linhaEndereco)
  await user.type(screen.getByLabelText(/cidade/i), validPersonal.cidade)
  await user.selectOptions(screen.getByLabelText(/estado/i), validPersonal.estado)
}

describe('RepresentativeStep (Etapa 1 - Acesso e Representante)', () => {
  it('renders the step indicator at step 1 of 4', () => {
    render(<RepresentativeStep onBack={vi.fn()} onContinue={vi.fn()} />)
    expect(screen.getByText('Representante').closest('li')).toHaveAttribute('aria-current', 'step')
  })

  it('applies masks and reflects slider changes', async () => {
    render(<RepresentativeStep onBack={vi.fn()} onContinue={vi.fn()} />)

    const cpfInput = screen.getByPlaceholderText('000.000.000-00')
    const cepInput = screen.getByPlaceholderText('00000-000')
    const slider = screen.getByRole('slider')

    fireEvent.change(slider, { target: { value: '30' } })
    expect(screen.getByText(/participação societária: 30%/i)).toBeInTheDocument()

    await userEvent.type(cpfInput, '52998224725')
    expect(cpfInput).toHaveValue('529.982.247-25')

    await userEvent.type(cepInput, '90000000')
    expect(cepInput).toHaveValue('90000-000')
  })

  it('validates CPF on blur', async () => {
    render(<RepresentativeStep onBack={vi.fn()} onContinue={vi.fn()} />)

    const cpfInput = screen.getByPlaceholderText('000.000.000-00')
    await userEvent.type(cpfInput, '11111111111')
    fireEvent.blur(cpfInput)

    expect(screen.getByText(/cpf inválido/i)).toBeInTheDocument()
  })

  it('does not show a CPF error on blur when the CPF is valid', async () => {
    render(<RepresentativeStep onBack={vi.fn()} onContinue={vi.fn()} />)

    const cpfInput = screen.getByPlaceholderText('000.000.000-00')
    await userEvent.type(cpfInput, '52998224725')
    fireEvent.blur(cpfInput)

    expect(screen.queryByText(/cpf inválido/i)).not.toBeInTheDocument()
  })

  it('shows validation errors for every required field and does not call onContinue when submitted empty', async () => {
    const onContinue = vi.fn()
    render(<RepresentativeStep onBack={vi.fn()} onContinue={onContinue} />)

    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))

    expect(await screen.findByText('Nome completo é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('E-mail é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Senha é obrigatória')).toBeInTheDocument()
    expect(screen.getByText('Cargo é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('CPF é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Data de nascimento é obrigatória')).toBeInTheDocument()
    expect(screen.getByText('Telefone é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('CEP é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Cidade é obrigatória')).toBeInTheDocument()
    expect(screen.getByText('Estado é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Endereço é obrigatório')).toBeInTheDocument()
    expect(onContinue).not.toHaveBeenCalled()
  })

  it('rejects a mismatched password confirmation', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    render(<RepresentativeStep onBack={vi.fn()} onContinue={onContinue} />)

    await user.type(screen.getByLabelText(/nome completo/i), validAccess.fullName)
    await user.type(screen.getByLabelText(/e-mail/i), validAccess.email)
    await user.type(screen.getByLabelText(/^senha/i), validAccess.password)
    await user.type(screen.getByLabelText(/confirmar senha/i), 'outra-senha')
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(screen.getByText('Senha e confirmação não coincidem')).toBeInTheDocument()
    expect(onContinue).not.toHaveBeenCalled()
  })

  it('calls onBack without validating the form', async () => {
    const onBack = vi.fn()
    render(<RepresentativeStep onBack={onBack} onContinue={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /voltar/i }))

    expect(onBack).toHaveBeenCalledOnce()
    expect(screen.queryByText('Nome completo é obrigatório')).not.toBeInTheDocument()
  })

  it('submits clean data (unmasked CPF/CEP) when the form is fully valid', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    render(<RepresentativeStep onBack={vi.fn()} onContinue={onContinue} />)

    await fillAll(user)
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining<Partial<RepresentativeData>>({
        fullName: validAccess.fullName,
        email: validAccess.email,
        password: validAccess.password,
        confirmPassword: validAccess.confirmPassword,
        cargoFuncao: validPersonal.cargoFuncao,
        cpf: '529.982.247-25',
        dateOfBirth: validPersonal.dateOfBirth,
        phone: '(11) 98765-4321',
        cep: '90000-000',
        cidade: validPersonal.cidade,
        estado: validPersonal.estado,
        pais: validPersonal.pais,
        linhaEndereco: validPersonal.linhaEndereco,
      }),
    )
  })

  it('restores previously entered values from initialValues', () => {
    render(
      <RepresentativeStep
        initialValues={{ fullName: 'João', cargoFuncao: 'Diretor(a)' }}
        onBack={vi.fn()}
        onContinue={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/nome completo/i)).toHaveValue('João')
    expect(screen.getByLabelText(/cargo \/ função/i)).toHaveValue('Diretor(a)')
  })
})
