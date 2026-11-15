import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { BlindPayComplement, validateBlindPayUpload } from './BlindPayComplement'

const photo = () => new File(['jpeg'], 'selfie.jpg', { type: 'image/jpeg' })
const proof = () => new File(['pdf'], 'comprovante.pdf', { type: 'application/pdf' })

describe('BlindPayComplement', () => {
  it('shows required validation without advancing the first step', async () => {
    const user = userEvent.setup()
    render(<BlindPayComplement />)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('Informe o país que emitiu o documento.')).toBeInTheDocument()
    expect(screen.getByText('Envie uma selfie em JPG ou PNG.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Documento de identificação e selfie' })).toBeInTheDocument()
  })

  it('validates accepted formats, file sizes and empty files', () => {
    expect(validateBlindPayUpload(new File(['x'], 'documento.pdf', { type: 'application/pdf' }), 'selfie')).toMatch(/JPG ou PNG/)
    expect(validateBlindPayUpload(new File([], 'selfie.png', { type: 'image/png' }), 'selfie')).toMatch(/vazio/)
    expect(
      validateBlindPayUpload(
        new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'comprovante.pdf', {
          type: 'application/pdf',
        }),
        'proof',
      ),
    ).toMatch(/3 MB/)
    expect(validateBlindPayUpload(photo(), 'selfie')).toBeNull()
    expect(validateBlindPayUpload(proof(), 'proof')).toBeNull()
  })

  it('navigates through document, address, terms and review without pretending to submit', async () => {
    const user = userEvent.setup()
    render(<BlindPayComplement />)

    await user.type(screen.getByLabelText('País de emissão do documento *'), 'Brasil')
    await user.upload(screen.getByLabelText('Selecionar selfie'), photo())
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByRole('heading', { name: 'Comprovante de endereço' })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Tipo de comprovante de endereço *'), 'electricity')
    await user.upload(screen.getByLabelText('Selecionar comprovante de endereço'), proof())
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByRole('heading', { name: 'Aceite dos termos BlindPay' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir termos BlindPay (indisponível)' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Ver revisão' }))
    expect(screen.getByRole('heading', { name: 'Revisão das informações' })).toBeInTheDocument()
    expect(screen.getByText('Conta de energia')).toBeInTheDocument()
    expect(screen.getByText('comprovante.pdf')).toBeInTheDocument()
    expect(screen.getByText('selfie.jpg')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar para BlindPay (indisponível)' })).toBeDisabled()
  })

  it('returns to the previous step without deleting the entered data', async () => {
    const user = userEvent.setup()
    render(<BlindPayComplement />)

    await user.type(screen.getByLabelText('País de emissão do documento *'), 'Canadá')
    await user.upload(screen.getByLabelText('Selecionar selfie'), photo())
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(screen.getByLabelText('País de emissão do documento *')).toHaveValue('Canadá')
    expect(screen.getByText('selfie.jpg')).toBeInTheDocument()
  })
})
