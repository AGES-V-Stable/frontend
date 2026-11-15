import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RepresentativeData } from '@/features/onboarding/types/registration'
import { RepresentativeStep } from '@/features/onboarding/pages/Register/RepresentativeStep'

const valid: RepresentativeData = {
  cargo_funcao: 'Diretor(a)',
  participacao_societaria: 45,
  cpf: '52998224725',
  date_of_birth: '1990-05-20',
  phone: '11987654321',
  cep: '90000000',
  cidade: 'Porto Alegre',
  estado: 'RS',
  pais: 'Brasil',
  linha_endereco: 'Av. Ipiranga, 6681',
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/cargo \/ função/i), 'Diretor(a)')
  await user.type(screen.getByPlaceholderText('000.000.000-00'), '52998224725')
  fireEvent.change(screen.getByLabelText(/data de nascimento/i), {
    target: { value: '1990-05-20' },
  })
  await user.type(screen.getByLabelText(/telefone/i), '11987654321')
  await user.type(screen.getByPlaceholderText('00000-000'), '90000000')
  await user.type(screen.getByLabelText(/linha de endereço/i), 'Rua Teste')
  await user.type(screen.getByLabelText(/cidade/i), 'São Paulo')
  await user.selectOptions(screen.getByLabelText(/estado/i), 'SP')
  // País já vem preenchido com "Brasil" por padrão.
}

describe('RepresentativeStep', () => {
  it('shows the design fields and the active step in the shared header', () => {
    render(<RepresentativeStep onContinue={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Dados do Representante' })).toBeInTheDocument()
    expect(screen.getByText('Representante').closest('li')).toHaveAttribute('aria-current', 'step')
  })

  it('uses the same state select as the company step', () => {
    // Given a etapa do representante vazia
    render(<RepresentativeStep onContinue={vi.fn()} />)

    // Then o estado usa o select compartilhado: borda dos campos, 27 opções e "Selecione" fora da lista
    const state = screen.getByLabelText('Estado *')
    expect(state).toHaveClass('border-sage-500', 'h-[50px]')
    expect(state.querySelectorAll('option:not([value=""])')).toHaveLength(27)
    const placeholder = state.querySelector('option[value=""]')
    expect(placeholder).toHaveTextContent('Selecione o estado')
    expect(placeholder).toHaveAttribute('hidden')
  })

  it('preloads and masks the provided initial values', () => {
    render(<RepresentativeStep initialValues={valid} onContinue={vi.fn()} />)
    expect(screen.getByLabelText(/cargo \/ função/i)).toHaveValue('Diretor(a)')
    expect(screen.getByText(/participação societária: 45%/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('529.982.247-25')).toBeInTheDocument()
    expect(screen.getByDisplayValue('90000-000')).toBeInTheDocument()
  })

  it('shows errors on every required field and does not call onContinue for an empty form', async () => {
    const onContinue = vi.fn()
    const user = userEvent.setup()
    render(<RepresentativeStep onContinue={onContinue} />)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('Informe o cargo.')).toBeInTheDocument()
    expect(screen.getByText('Informe o CPF.')).toBeInTheDocument()
    expect(screen.getByText('Informe a data de nascimento.')).toBeInTheDocument()
    expect(screen.getByText('Informe o telefone.')).toBeInTheDocument()
    expect(screen.getByText('Informe o CEP.')).toBeInTheDocument()
    expect(screen.getByText('Informe a cidade.')).toBeInTheDocument()
    expect(screen.getByText('Informe o estado.')).toBeInTheDocument()
    expect(screen.getByText('Informe o endereço.')).toBeInTheDocument()
    expect(screen.queryByText('Informe o país.')).not.toBeInTheDocument()
    expect(onContinue).not.toHaveBeenCalled()
  })

  it('applies input masks and reflects slider changes', async () => {
    const user = userEvent.setup()
    render(<RepresentativeStep onContinue={vi.fn()} />)

    const cpfInput = screen.getByPlaceholderText('000.000.000-00')
    const cepInput = screen.getByPlaceholderText('00000-000')
    const phoneInput = screen.getByLabelText(/telefone/i)
    const slider = screen.getByRole('slider')

    fireEvent.change(slider, { target: { value: '30' } })
    expect(screen.getByText(/participação societária: 30%/i)).toBeInTheDocument()

    await user.type(cpfInput, '52998224725')
    expect(cpfInput).toHaveValue('529.982.247-25')

    await user.type(cepInput, '90000000')
    expect(cepInput).toHaveValue('90000-000')

    await user.type(phoneInput, '11987654321')
    expect(phoneInput).toHaveValue('(11) 98765-4321')
  })

  it('validates the CPF on blur and highlights the client-side error', async () => {
    const user = userEvent.setup()
    render(<RepresentativeStep onContinue={vi.fn()} />)

    const cpfInput = screen.getByPlaceholderText('000.000.000-00')
    await user.type(cpfInput, '11111111111')
    fireEvent.blur(cpfInput)

    expect(screen.getByText(/não formam um CPF válido/i)).toBeInTheDocument()
  })

  it('does not show an error on blur when the CPF is valid', async () => {
    const user = userEvent.setup()
    render(<RepresentativeStep onContinue={vi.fn()} />)

    const cpfInput = screen.getByPlaceholderText('000.000.000-00')
    await user.type(cpfInput, '52998224725')
    fireEvent.blur(cpfInput)

    expect(screen.queryByText(/não formam um CPF válido/i)).not.toBeInTheDocument()
  })

  it('clears a field error message as the user types again', async () => {
    const user = userEvent.setup()
    render(<RepresentativeStep onContinue={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Informe a cidade.')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/cidade/i), 'A')

    expect(screen.queryByText('Informe a cidade.')).not.toBeInTheDocument()
  })

  it('calls onContinue with the current masked data on a valid submission', async () => {
    const onContinue = vi.fn()
    const user = userEvent.setup()
    render(<RepresentativeStep onContinue={onContinue} />)

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(onContinue).toHaveBeenCalledWith({
      cargo_funcao: 'Diretor(a)',
      participacao_societaria: 0,
      cpf: '529.982.247-25',
      date_of_birth: '1990-05-20',
      phone: '(11) 98765-4321',
      cep: '90000-000',
      cidade: 'São Paulo',
      estado: 'SP',
      pais: 'Brasil',
      linha_endereco: 'Rua Teste',
    })
  })

  it('shows the server error message when provided', () => {
    render(<RepresentativeStep onContinue={vi.fn()} serverError="Ocorreu um erro ao salvar." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Ocorreu um erro ao salvar.')
  })

  it('disables the fields and the submit button while saving', () => {
    render(<RepresentativeStep onContinue={vi.fn()} saving />)
    expect(screen.getByLabelText(/cargo \/ função/i)).toBeDisabled()
    expect(screen.getByPlaceholderText('000.000.000-00')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Processando...' })).toBeDisabled()
  })
})
