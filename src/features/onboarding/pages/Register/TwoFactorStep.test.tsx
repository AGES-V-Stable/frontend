import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { twoFactorService } from '@/features/auth'
import { TwoFactorStep } from './TwoFactorStep'

vi.mock('@/features/auth', () => ({
  twoFactorService: {
    setup: vi.fn().mockResolvedValue({
      otpauthUri: 'otpauth://totp/V-Stable:test@empresa.com?secret=TESTSECRET123',
      secret: 'TESTSECRET123',
    }),
    activate: vi.fn().mockResolvedValue({ success: true }),
  },
}))

describe('TwoFactorStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title, QR code container and skip button', async () => {
    render(<TwoFactorStep kycVerificationId="kyc-123" onContinue={vi.fn()} onSkip={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Segurança da Conta (2FA)' })).toBeInTheDocument()
    expect(
      await screen.findByText('Configuração de Segurança em Duas Etapas (2FA)'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Configurar 2FA mais tarde' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ativar 2FA' })).toBeInTheDocument()
  })

  it('calls onSkip when user clicks to configure 2FA later', async () => {
    const user = userEvent.setup()
    const onSkip = vi.fn()
    render(<TwoFactorStep kycVerificationId="kyc-123" onContinue={vi.fn()} onSkip={onSkip} />)

    const skipBtn = screen.getByRole('button', { name: 'Configurar 2FA mais tarde' })
    await user.click(skipBtn)

    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('activates 2FA and allows proceeding to compliance on success', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    render(<TwoFactorStep kycVerificationId="kyc-123" onContinue={onContinue} onSkip={vi.fn()} />)

    const input = await screen.findByLabelText('Código de autenticação')
    await user.type(input, '123456')

    const submitBtn = screen.getByRole('button', { name: 'Ativar 2FA' })
    await user.click(submitBtn)

    expect(twoFactorService.activate).toHaveBeenCalledWith('123456')
    expect(
      await screen.findByText('✓ Autenticação de dois fatores configurada com sucesso!'),
    ).toBeInTheDocument()

    const continueBtn = screen.getByRole('button', { name: 'Avançar para o Compliance' })
    await user.click(continueBtn)
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('shows error message when activation fails', async () => {
    const user = userEvent.setup()
    vi.mocked(twoFactorService.activate).mockRejectedValueOnce(
      new Error('Código de autenticação inválido ou expirado.'),
    )
    render(<TwoFactorStep kycVerificationId="kyc-123" onContinue={vi.fn()} onSkip={vi.fn()} />)

    const input = await screen.findByLabelText('Código de autenticação')
    await user.type(input, '000000')

    const submitBtn = screen.getByRole('button', { name: 'Ativar 2FA' })
    await user.click(submitBtn)

    expect(
      await screen.findByText('Código de autenticação inválido ou expirado.'),
    ).toBeInTheDocument()
  })
})

