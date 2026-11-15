import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { KycFullPreview } from './KycFullPreview'

describe('KycFullPreview', () => {
  it('allows inspecting all KYC screens without submitting any data', async () => {
    const user = userEvent.setup()
    render(<KycFullPreview />)

    expect(screen.getByRole('heading', { name: 'Dados de acesso' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '4. Documentos Avenia' }))
    expect(screen.getByRole('heading', { name: 'Compliance e documentos' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '5. Verificação facial' }))
    expect(screen.getByRole('heading', { name: 'Verificação facial (Avenia)' })).toBeInTheDocument()
    expect(screen.getByText(/nenhuma verificação de identidade foi realizada/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '6. Complementação BlindPay' }))
    expect(screen.getByRole('heading', { name: 'Complementação cadastral' })).toBeInTheDocument()
    expect(screen.getByLabelText('País de emissão do documento *')).toBeInTheDocument()
  })
})
