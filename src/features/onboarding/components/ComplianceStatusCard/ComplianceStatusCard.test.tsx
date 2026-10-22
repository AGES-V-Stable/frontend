import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ComplianceStatusCard } from '@/features/onboarding/components/ComplianceStatusCard/ComplianceStatusCard'
import { ComplianceStatus } from '@/features/onboarding/components/ComplianceStatusCard/ComplianceStatusType'
import { twoFactorService } from '@/features/auth'

vi.mock('@/features/auth', () => ({
  twoFactorService: {
    isActivated: vi.fn(),
    setActivated: vi.fn(),
    setup: vi.fn().mockResolvedValue({
      otpauthUri: 'otpauth://totp/V-Stable:test@empresa.com?secret=TESTSECRET123',
      secret: 'TESTSECRET123',
    }),
    activate: vi.fn().mockResolvedValue({ success: true }),
  },
}))

function renderCard(status: ComplianceStatus, initialTwoFactorActive?: boolean) {
  return render(
    <MemoryRouter>
      <ComplianceStatusCard status={status} initialTwoFactorActive={initialTwoFactorActive} />
    </MemoryRouter>,
  )
}

describe('ComplianceStatusCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('given status IN_REVIEW and 2FA active, when rendered, then it should display the analysis content', () => {
    vi.mocked(twoFactorService.isActivated).mockReturnValue(true)
    renderCard(ComplianceStatus.IN_REVIEW)

    expect(screen.getByText('Em análise')).toBeInTheDocument()
    expect(screen.getByText('Seu cadastro está em análise')).toBeInTheDocument()
    expect(screen.getByText('Análise de compliance em andamento')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Atualizar status' })).toBeInTheDocument()
    expect(screen.getByAltText('Em análise')).toBeInTheDocument()
  })

  it('given status IN_REVIEW and 2FA not active, then it should display the mandatory 2FA setup container', async () => {
    vi.mocked(twoFactorService.isActivated).mockReturnValue(false)
    renderCard(ComplianceStatus.IN_REVIEW)

    expect(screen.getByText('Em análise')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Ativação de Segurança Obrigatória' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('Configuração de Segurança em Duas Etapas (2FA)'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ativar 2FA' })).toBeInTheDocument()
  })

  it('given status IN_REVIEW and 2FA not active, when activated, displays recovery codes container before transitioning to in review status', async () => {
    const user = userEvent.setup()
    vi.mocked(twoFactorService.isActivated).mockReturnValue(false)
    vi.mocked(twoFactorService.activate).mockResolvedValueOnce({
      success: true,
      recoveryCodes: ['ABCD-1234', 'EFGH-5678'],
    })
    renderCard(ComplianceStatus.IN_REVIEW)

    const input = await screen.findByLabelText('Código de autenticação')
    await user.type(input, '123456')
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA' }))

    expect(
      await screen.findByRole('heading', { name: 'Códigos de recuperação de emergência' }),
    ).toBeInTheDocument()
    expect(screen.getByText('ABCD-1234')).toBeInTheDocument()

    const completeBtn = screen.getByRole('button', { name: 'Concluir Configuração' })
    expect(completeBtn).toBeDisabled()

    await user.click(
      screen.getByLabelText('Confirmo que anotei ou salvei meus códigos em local seguro'),
    )
    expect(completeBtn).toBeEnabled()

    await user.click(completeBtn)
    expect(await screen.findByText('Seu cadastro está em análise')).toBeInTheDocument()
  })

  it('given status APPROVED and 2FA not active, then it should display the mandatory 2FA setup container', async () => {
    vi.mocked(twoFactorService.isActivated).mockReturnValue(false)
    renderCard(ComplianceStatus.APPROVED)

    expect(screen.getByText('Cadastro Aprovado')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Ativação de Segurança Obrigatória' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('Configuração de Segurança em Duas Etapas (2FA)'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ativar 2FA e Acessar Plataforma' }),
    ).toBeInTheDocument()
  })

  it('given status APPROVED and 2FA already active, then it should display the account unlocked content and access button', () => {
    vi.mocked(twoFactorService.isActivated).mockReturnValue(true)
    renderCard(ComplianceStatus.APPROVED)

    expect(screen.getByText('Aprovado')).toBeInTheDocument()
    expect(screen.getByText('Cadastro aprovado')).toBeInTheDocument()
    expect(screen.getByText('Conta liberada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acessar plataforma' })).toBeInTheDocument()
    expect(screen.getByAltText('Aprovado')).toBeInTheDocument()
  })

  it('given status NOT_APPROVED, when rendered, then it should display the not approved content', () => {
    renderCard(ComplianceStatus.NOT_APPROVED)

    expect(screen.getByText('Não aprovado')).toBeInTheDocument()
    expect(screen.getByText('Cadastro não aprovado')).toBeInTheDocument()
    expect(screen.getByText('Ação necessária')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revisar dados' })).toBeInTheDocument()
    expect(screen.getByAltText('Não aprovado')).toBeInTheDocument()
  })

  it('given status APPROVED and 2FA not active, when activated, displays recovery codes container before unlocking account', async () => {
    const user = userEvent.setup()
    vi.mocked(twoFactorService.isActivated).mockReturnValue(false)
    vi.mocked(twoFactorService.activate).mockResolvedValueOnce({
      success: true,
      recoveryCodes: ['ABCD-1234', 'EFGH-5678'],
    })
    renderCard(ComplianceStatus.APPROVED)

    const input = await screen.findByLabelText('Código de autenticação')
    await user.type(input, '123456')
    await user.click(screen.getByRole('button', { name: 'Ativar 2FA e Acessar Plataforma' }))

    expect(
      await screen.findByRole('heading', { name: 'Códigos de recuperação de emergência' }),
    ).toBeInTheDocument()
    expect(screen.getByText('ABCD-1234')).toBeInTheDocument()

    const completeBtn = screen.getByRole('button', { name: 'Concluir Configuração' })
    expect(completeBtn).toBeDisabled()

    await user.click(
      screen.getByLabelText('Confirmo que anotei ou salvei meus códigos em local seguro'),
    )
    expect(completeBtn).toBeEnabled()
  })
})
