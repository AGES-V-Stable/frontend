import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { compliancePath, PATHS } from '@/routes/paths'
import { getCompanyComplianceStatus } from '@/services/companies'
import { getCurrentOnboarding } from '@/services/onboarding'
import type { CurrentOnboarding } from '@/types/onboarding'

import { toCardStatus } from '@/utils/complianceStatus'

import { RegisterStatus } from './RegisterStatus'

vi.mock('@/services/onboarding', () => ({ getCurrentOnboarding: vi.fn() }))
vi.mock('@/services/companies', () => ({ getCompanyComplianceStatus: vi.fn() }))

const onboarding = (overrides: Partial<CurrentOnboarding> = {}): CurrentOnboarding => ({
  kycVerificationId: 'kyc-1',
  companyId: 'c1',
  status: 'UNDER_REVIEW',
  documentSubmitted: true,
  livenessSubmitted: true,
  ...overrides,
})

const company = (overallStatus: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED') => ({
  id: 'c1',
  legalName: 'Empresa',
  tradeName: null,
  cnpj: '11222333000181',
  statusKyb: overallStatus,
  statusAml: overallStatus,
  overallStatus,
  documents: [],
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[PATHS.REGISTER_STATUS]}>
      <Routes>
        <Route path={PATHS.REGISTER_STATUS} element={<RegisterStatus />} />
        <Route path={PATHS.REGISTER_COMPLIANCE} element={<p>Compliance step</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RegisterStatus Page Component', () => {
  beforeEach(() => {
    vi.mocked(getCurrentOnboarding).mockResolvedValue(onboarding())
    vi.mocked(getCompanyComplianceStatus).mockResolvedValue(company('PENDING'))
  })

  it('shows the in-review card while the representative or the company is still being analysed', async () => {
    renderPage()

    expect(await screen.findByText('Seu cadastro está em análise')).toBeInTheDocument()
    expect(screen.getByText('Identidade do representante').nextElementSibling).toHaveTextContent(
      'Em análise',
    )
    expect(screen.getByText('Cadastro pendente')).toBeInTheDocument()
    expect(getCompanyComplianceStatus).toHaveBeenCalledWith('c1', expect.any(AbortSignal))
  })

  it('displays the support text', async () => {
    renderPage()

    expect(
      await screen.findByText('Precisa de ajuda? Entre em contato com o suporte da V-Stable.'),
    ).toBeInTheDocument()
  })

  it('offers to continue an unfinished registration', async () => {
    const user = userEvent.setup()
    vi.mocked(getCurrentOnboarding).mockResolvedValue(
      onboarding({ status: 'PENDING', documentSubmitted: false, livenessSubmitted: false }),
    )
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Continuar cadastro' }))

    expect(await screen.findByText('Compliance step')).toBeInTheDocument()
    expect(compliancePath('kyc-1')).toContain('kyc-1')
  })

  it('shows an error when the status cannot be loaded', async () => {
    vi.mocked(getCurrentOnboarding).mockRejectedValue(new Error('404'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a situação do seu cadastro.',
    )
  })
})

describe('toCardStatus', () => {
  it('only approves when both the representative and the company are approved', () => {
    expect(toCardStatus('APPROVED', 'APPROVED')).toBe('APPROVED')
    expect(toCardStatus('APPROVED', 'UNDER_REVIEW')).toBe('IN_REVIEW')
    expect(toCardStatus('APPROVED', null)).toBe('IN_REVIEW')
    expect(toCardStatus('PENDING', 'PENDING')).toBe('IN_REVIEW')
  })

  it('reports rejection from either analysis', () => {
    expect(toCardStatus('REJECTED', 'APPROVED')).toBe('NOT_APPROVED')
    expect(toCardStatus('APPROVED', 'REJECTED')).toBe('NOT_APPROVED')
  })
})
