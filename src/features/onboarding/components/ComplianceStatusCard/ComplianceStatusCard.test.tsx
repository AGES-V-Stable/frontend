import { render, screen } from '@testing-library/react'
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

function renderCard(status: ComplianceStatus) {
  return render(
    <MemoryRouter>
      <ComplianceStatusCard status={status} />
    </MemoryRouter>,
  )
}

describe('ComplianceStatusCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('given status IN_REVIEW, when rendered, then it should display the analysis content', () => {
    renderCard(ComplianceStatus.IN_REVIEW)

    expect(screen.getByText('Em análise')).toBeInTheDocument()
    expect(screen.getByText('Seu cadastro está em análise')).toBeInTheDocument()
    expect(screen.getByText('Análise de compliance em andamento')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Atualizar status' })).toBeInTheDocument()
    expect(screen.getByAltText('Em análise')).toBeInTheDocument()
  })

  it('given status APPROVED and 2FA not active, then it should display the mandatory 2FA setup container', async () => {
    vi.mocked(twoFactorService.isActivated).mockReturnValue(false)
    renderCard(ComplianceStatus.APPROVED)

    expect(screen.getByText('Cadastro Aprovado')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ativação de Segurança Obrigatória' })).toBeInTheDocument()
    expect(await screen.findByText('Configuração de Segurança em Duas Etapas (2FA)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ativar 2FA e Acessar Plataforma' })).toBeInTheDocument()
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
})
