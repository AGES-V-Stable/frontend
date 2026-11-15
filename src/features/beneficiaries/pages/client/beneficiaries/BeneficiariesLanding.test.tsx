import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BeneficiariesLanding } from '@/features/beneficiaries/pages/client/beneficiaries/BeneficiariesLanding'
import { useSession } from '@/features/auth'
import { PATHS } from '@/shared/navigation/paths'

vi.mock('@/features/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth')>()),
  useSession: vi.fn(),
}))

function mockSession(permissions: string[]) {
  vi.mocked(useSession).mockReturnValue({
    status: 'authenticated',
    user: {
      id: 'u1',
      name: 'Marina Costa',
      email: 'marina@example.com',
      companyId: 'c1',
      accountType: 'USER',
      roles: ['ROLE_USER'],
      companyAccess: {
        membershipId: 'm1',
        companyId: 'c1',
        role: permissions.includes('BENEFICIARY_WRITE') ? 'OPERATOR' : 'VIEWER',
        status: 'ACTIVE',
        permissions,
        version: 1,
      },
    },
    company: null,
    error: null,
    retry: vi.fn(),
  })
}

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={[PATHS.BENEFICIARIES]}>
      <Routes>
        <Route path={PATHS.BENEFICIARIES} element={<BeneficiariesLanding />} />
        <Route path={PATHS.BENEFICIARIES_NEW} element={<p>Tela de cadastro</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BeneficiariesLanding', () => {
  beforeEach(() => mockSession(['BENEFICIARY_READ', 'BENEFICIARY_WRITE']))

  it('renders the heading and a button to create a new beneficiary', async () => {
    renderLanding()

    expect(await screen.findByRole('heading', { name: 'Beneficiários' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo beneficiário' })).toBeInTheDocument()
  })

  it('navigates to the create screen when the button is clicked', async () => {
    const user = userEvent.setup()
    renderLanding()

    await user.click(await screen.findByRole('button', { name: 'Novo beneficiário' }))

    expect(await screen.findByText('Tela de cadastro')).toBeInTheDocument()
  })

  it('given a profile without BENEFICIARY_WRITE, then it lists the beneficiaries without the action to create one', async () => {
    mockSession(['BENEFICIARY_READ'])
    renderLanding()

    expect(await screen.findByRole('heading', { name: 'Beneficiários' })).toBeInTheDocument()
    expect(screen.getByText(/Consulte os beneficiários/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Novo beneficiário' })).not.toBeInTheDocument()
  })
})
