import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { BlindPayIndividualKyc } from './BlindPayIndividualKyc'

describe('BlindPayIndividualKyc', () => {
  it('shows required errors before leaving the personal data step', async () => {
    const user = userEvent.setup()
    render(<BlindPayIndividualKyc previewOnly />)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getAllByText('Campo obrigatório.').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Dados pessoais e endereço' })).toBeInTheDocument()
  })

  it('lets reviewers navigate all screens without submitting KYC', async () => {
    const user = userEvent.setup()
    render(<BlindPayIndividualKyc previewOnly />)

    for (const [label, value] of [
      ['Primeiro nome', 'Joana'],
      ['Sobrenome', 'Silva'],
      ['CPF (somente números)', '52998224725'],
      ['Telefone (+55...)', '+5551999999999'],
      ['Endereço e número', 'Rua Exemplo 100'],
      ['Cidade', 'Porto Alegre'],
      ['Estado (UF)', 'RS'],
      ['CEP (somente números)', '90000000'],
    ]) {
      await user.type(screen.getByLabelText(label), value)
    }
    fireEvent.change(screen.getByLabelText('Data de nascimento'), {
      target: { value: '1994-05-12' },
    })
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByRole('heading', { name: 'Documentos e selfie' })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Tipo de documento *'), 'PASSPORT')
    await user.upload(
      screen.getByLabelText('Passaporte *'),
      new File(['jpg'], 'passaporte.jpg', { type: 'image/jpeg' }),
    )
    await user.upload(
      screen.getByLabelText('Selfie do rosto *'),
      new File(['jpg'], 'selfie.jpg', { type: 'image/jpeg' }),
    )
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByRole('heading', { name: 'Aceite dos termos BlindPay' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Iniciar aceite (desativado na prévia)' }),
    ).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByRole('heading', { name: 'Revisão e envio' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Envio desativado na prévia' })).toBeDisabled()
  })
})
