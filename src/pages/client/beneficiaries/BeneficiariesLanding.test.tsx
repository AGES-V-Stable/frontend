import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BeneficiariesLanding } from './BeneficiariesLanding'
import { getCurrentUser } from '@/services/user'
import { PATHS } from '@/routes/paths'

vi.mock('@/services/user', () => ({
  getCurrentUser: vi.fn(),
}))

describe('BeneficiariesLanding', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1',
      name: 'Marina Costa',
      email: 'marina@example.com',
      companyId: 'c1',
    })
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
})
