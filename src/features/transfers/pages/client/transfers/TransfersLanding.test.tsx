import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSession } from '@/features/auth'
import { getClientTransfers } from '@/features/transfers/api/transfers'
import { TransfersLanding } from '@/features/transfers/pages/client/transfers/TransfersLanding'
import { PATHS } from '@/shared/navigation/paths'

vi.mock('@/features/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth')>()),
  useSession: vi.fn(),
}))

vi.mock('@/features/transfers/api/transfers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/transfers/api/transfers')>()),
  getClientTransfers: vi.fn(),
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
        role: permissions.includes('TRANSFER_CREATE') ? 'OPERATOR' : 'VIEWER',
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
    <MemoryRouter initialEntries={[PATHS.TRANSFERS]}>
      <Routes>
        <Route path={PATHS.TRANSFERS} element={<TransfersLanding />} />
        <Route path={PATHS.TRANSFERS_NEW} element={<p>Tela de nova transferência</p>} />
        <Route path={PATHS.TRANSFER_DETAILS} element={<p>Detalhes da transferência</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TransfersLanding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession(['TRANSFER_READ', 'TRANSFER_CREATE'])
    vi.mocked(getClientTransfers).mockResolvedValue({
      data: [
        {
          id: 'tx-1',
          empresa: '',
          beneficiario: 'Fornecedor Global Ltda.',
          data: '2026-11-10T12:00:00Z',
          tipo: 'Pagamento',
          valor: '1500.00',
          moeda: 'USD',
          status: 'Concluída',
          cotacao: null,
          custos: null,
        },
      ],
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
    })
  })

  it('renders the transfer history, the Realizar transferência button, and opens transfer creation', async () => {
    const user = userEvent.setup()
    renderLanding()

    expect(
      await screen.findByRole('heading', { name: 'Histórico de Transferências' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Fornecedor Global Ltda.')).toBeInTheDocument()
    expect(screen.getByText('1 transferência')).toBeInTheDocument()
    expect(screen.queryByText('Todas as transferências')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Realizar transferência' }))

    expect(await screen.findByText('Tela de nova transferência')).toBeInTheDocument()
  })

  it('navigates to transfer details when clicking Ver detalhes', async () => {
    const user = userEvent.setup()
    renderLanding()

    await screen.findByText('Fornecedor Global Ltda.')
    await user.click(screen.getByRole('button', { name: /Ver detalhes/ }))

    expect(await screen.findByText('Detalhes da transferência')).toBeInTheDocument()
  })

  it('hides Realizar transferência for a profile without TRANSFER_CREATE', async () => {
    mockSession(['TRANSFER_READ'])
    renderLanding()

    expect(
      await screen.findByRole('heading', { name: 'Histórico de Transferências' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Fornecedor Global Ltda.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Realizar transferência' })).not.toBeInTheDocument()
  })
})
