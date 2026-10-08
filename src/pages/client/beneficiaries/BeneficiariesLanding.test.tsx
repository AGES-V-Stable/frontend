import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BeneficiariesLanding } from './BeneficiariesLanding'
import { getCurrentUser } from '@/services/user'
import { getCompanyBeneficiaries } from '@/services/beneficiary'
import type { Beneficiary } from '@/types/beneficiary'
import { PATHS } from '@/routes/paths'

vi.mock('@/services/user', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/services/beneficiary', () => ({
  getCompanyBeneficiaries: vi.fn(),
}))

const emptyPage = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 }

describe('BeneficiariesLanding', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1',
      name: 'Marina Costa',
      email: 'marina@example.com',
      companyId: 'c1',
      accountType: 'USER',
      roles: ['ROLE_USER'],
    })
    vi.mocked(getCompanyBeneficiaries).mockResolvedValue(emptyPage)
  })

  it('renders the heading and a button to create a new beneficiary', async () => {
    render(
      <MemoryRouter initialEntries={[PATHS.BENEFICIARIES]}>
        <Routes>
          <Route path={PATHS.BENEFICIARIES} element={<BeneficiariesLanding />} />
          <Route path={PATHS.BENEFICIARIES_NEW} element={<p>Tela de cadastro</p>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Beneficiários' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo beneficiário' })).toBeInTheDocument()
  })

  it('navigates to the create screen when the button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[PATHS.BENEFICIARIES]}>
        <Routes>
          <Route path={PATHS.BENEFICIARIES} element={<BeneficiariesLanding />} />
          <Route path={PATHS.BENEFICIARIES_NEW} element={<p>Tela de cadastro</p>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'Novo beneficiário' }))

    expect(await screen.findByText('Tela de cadastro')).toBeInTheDocument()
  })

  it('lists the beneficiaries of the current user company', async () => {
    const beneficiary = {
      id: 'b1',
      companyId: 'c1',
      beneficiaryType: 'LEGAL_ENTITY',
      legalName: 'Atlas Imports LLC',
      nickname: 'Fornecedor EUA',
      receivingMethod: 'BANK_ACCOUNT',
      country: 'Estados Unidos',
      createdAt: '2026-09-10T12:00:00Z',
      updatedAt: null,
    } satisfies Beneficiary
    vi.mocked(getCompanyBeneficiaries).mockResolvedValue({
      ...emptyPage,
      content: [beneficiary],
      totalElements: 1,
      totalPages: 1,
    })

    render(
      <MemoryRouter initialEntries={[PATHS.BENEFICIARIES]}>
        <Routes>
          <Route path={PATHS.BENEFICIARIES} element={<BeneficiariesLanding />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Fornecedor EUA')).toBeInTheDocument()
    expect(screen.getByText('Atlas Imports LLC')).toBeInTheDocument()
    expect(screen.getByText('Conta bancária')).toBeInTheDocument()
    expect(getCompanyBeneficiaries).toHaveBeenCalledWith(
      'c1',
      { page: 1, size: 10 },
      expect.any(AbortSignal),
    )
  })

  it('shows an empty state when the company has no beneficiaries', async () => {
    render(
      <MemoryRouter initialEntries={[PATHS.BENEFICIARIES]}>
        <Routes>
          <Route path={PATHS.BENEFICIARIES} element={<BeneficiariesLanding />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Nenhum beneficiário cadastrado ainda.')).toBeInTheDocument()
  })

  it('shows an error when the list cannot be loaded', async () => {
    vi.mocked(getCompanyBeneficiaries).mockRejectedValue(new Error('403'))

    render(
      <MemoryRouter initialEntries={[PATHS.BENEFICIARIES]}>
        <Routes>
          <Route path={PATHS.BENEFICIARIES} element={<BeneficiariesLanding />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByText('Não foi possível carregar os beneficiários.'),
    ).toBeInTheDocument()
  })
})
