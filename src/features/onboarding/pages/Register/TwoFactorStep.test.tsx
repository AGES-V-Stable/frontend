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
    activate: vi.fn().mockResolvedValue({
      success: true,
      recoveryCodes: [
        'A1B2-C3D4',
        'E5F6-G7H8',
        'J9K0-L1M2',
        'N3P4-Q5R6',
        'S7T8-U9V0',
        'W1X2-Y3Z4',
        'B5C6-D7E8',
        'F9G0-H1J2',
      ],
    }),
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

  it('activates 2FA and displays recovery codes before proceeding to compliance', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    render(<TwoFactorStep kycVerificationId="kyc-123" onContinue={onContinue} onSkip={vi.fn()} />)

    const input = await screen.findByLabelText('Código de autenticação')
    await user.type(input, '123456')

    const submitBtn = screen.getByRole('button', { name: 'Ativar 2FA' })
    await user.click(submitBtn)

    expect(twoFactorService.activate).toHaveBeenCalledWith('123456')

    // Deve exibir a tela de códigos de recuperação pós-ativação
    expect(
      await screen.findByRole('heading', { name: 'Códigos de recuperação de emergência' }),
    ).toBeInTheDocument()
    expect(screen.getByText('A1B2-C3D4')).toBeInTheDocument()
    expect(screen.getByText('F9G0-H1J2')).toBeInTheDocument()

    // Botão fica desabilitado até confirmar o checkbox
    const completeBtn = screen.getByRole('button', { name: 'Concluir Configuração' })
    expect(completeBtn).toBeDisabled()

    const checkbox = screen.getByLabelText(
      'Confirmo que anotei ou salvei meus códigos em local seguro',
    )
    await user.click(checkbox)
    expect(completeBtn).toBeEnabled()

    await user.click(completeBtn)
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
it('blocks activation after setup fails and allows a retry', async () => {
  vi.clearAllMocks()
  vi.mocked(twoFactorService.setup).mockRejectedValueOnce(new Error('Setup unavailable'))
  const onContinue = vi.fn()
  render(<TwoFactorStep kycVerificationId="kyc-123" onContinue={onContinue} onSkip={vi.fn()} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Setup unavailable')
  expect(screen.getByRole('button', { name: 'Ativar 2FA' })).toBeDisabled()
  expect(twoFactorService.activate).not.toHaveBeenCalled()
  expect(onContinue).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByText('TESTSECRET123')).toBeInTheDocument()
})
