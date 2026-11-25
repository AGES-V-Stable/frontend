import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'

import AppRoutes from './AppRoutes'
import { SessionContext, type Session } from '@/features/auth/model/useSession'
import { getClientTransfers } from '@/features/transfers/api/transfers'
import { getTransferDetails, TransferDetailsError } from '@/features/transfers/api/transferDetails'
import { getCompanyBeneficiaries } from '@/features/beneficiaries'

vi.mock('@/features/transfers/api/transfers', async (original) => ({
  ...(await original<typeof import('@/features/transfers/api/transfers')>()),
  getClientTransfers: vi.fn(),
}))
vi.mock('@/features/transfers/api/transferDetails', async (original) => ({
  ...(await original<typeof import('@/features/transfers/api/transferDetails')>()),
  getTransferDetails: vi.fn(),
}))
vi.mock('@/features/beneficiaries', async (original) => ({
  ...(await original<typeof import('@/features/beneficiaries')>()),
  getCompanyBeneficiaries: vi.fn(),
}))
vi.mock('@/features/dashboard/pages/Dashboard', () => ({
  Dashboard: () => <h1>Dashboard de destino</h1>,
}))

const id = '17f2df21-32ed-45b2-b1cc-83146bb39cbb'
const listPath = '/app/transferencias?source=history#rows'
const detailPath = `/app/transferencias/${id}`
let session: Session

function Location() {
  const go = useNavigate()
  const { pathname, search, hash } = useLocation()
  return (
    <>
      <output aria-label="Rota">{pathname + search + hash}</output>
      <button onClick={() => void go(-1)}>Voltar no navegador</button>
      <button onClick={() => void go(1)}>Avançar no navegador</button>
    </>
  )
}

function renderHistory(path = listPath) {
  return render(
    <SessionContext.Provider value={session}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
        <Location />
      </MemoryRouter>
    </SessionContext.Provider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  session = {
    status: 'authenticated',
    user: {
      id: 'user-1',
      name: 'Conta de teste',
      email: 'test@example.test',
      companyId: 'company-1',
      accountType: 'USER',
      roles: ['ROLE_USER'],
      companyAccess: {
        membershipId: 'membership-1',
        companyId: 'company-1',
        role: 'VIEWER',
        status: 'ACTIVE',
        permissions: ['TRANSFER_READ'],
        version: 1,
      },
    },
    company: null,
    error: null,
    retry: vi.fn(),
  }
  vi.mocked(getCompanyBeneficiaries).mockResolvedValue({
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: 100,
  })
  vi.mocked(getClientTransfers).mockResolvedValue({
    data: [
      {
        id,
        empresa: '',
        beneficiario: 'Fornecedor de teste',
        data: '2026-11-10T12:00:00Z',
        tipo: 'Pagamento',
        valor: '10.00',
        moeda: 'USD',
        status: 'Concluída',
        cotacao: null,
        custos: null,
      },
    ],
    totalItems: 24,
    totalPages: 2,
    currentPage: 1,
  })
  vi.mocked(getTransferDetails).mockResolvedValue({
    id,
    companyId: 'company-1',
    date: '2026-11-10T12:00:00Z',
    type: 'PAGAMENTO',
    status: 'SETTLED',
    counterpartyName: 'Detalhe de teste',
    counterpartyDetails: null,
    source: { amount: '50.00', currency: 'BRL' },
    destination: { amount: '10.00', currency: 'USD' },
    fundingSource: null,
    exchangeRate: null,
    costs: { serviceFee: null, spreadPercentage: null, estimatedMarketCost: null },
    estimatedSavings: null,
    receiptAvailable: false,
  })
})

it('retains the company list instance, filters, page, scroll and opener focus behind the drawer', async () => {
  const user = userEvent.setup()
  renderHistory()
  await screen.findByText('Fornecedor de teste')
  await user.click(screen.getByRole('button', { name: 'Filtrar transferências' }))
  await user.selectOptions(screen.getByLabelText('Status'), 'Concluída')
  await user.click(screen.getByRole('button', { name: /^Filtrar$/ }))
  await waitFor(() =>
    expect(getClientTransfers).toHaveBeenLastCalledWith(
      1,
      12,
      expect.objectContaining({ status: 'Concluída' }),
      expect.any(AbortSignal),
    ),
  )
  await user.click(screen.getByRole('button', { name: 'Próxima' }))
  await screen.findByText('2 de 2')
  const table = screen.getByRole('table')
  const section = screen
    .getByRole('heading', { name: 'Histórico de Transferências' })
    .closest('section')!
  section.scrollTop = 120
  const opener = screen.getByRole('button', { name: /Ver detalhes/ })
  const calls = vi.mocked(getClientTransfers).mock.calls.length

  await user.click(opener)
  expect(
    await screen.findByRole('dialog', { name: 'Detalhes da transferência' }),
  ).toBeInTheDocument()
  await screen.findByText('Detalhe de teste')
  expect(screen.getByRole('table')).toBe(table)
  expect(section.scrollTop).toBe(120)
  expect(screen.getByText('2 de 2')).toBeInTheDocument()
  expect(getClientTransfers).toHaveBeenCalledTimes(calls)
  expect(screen.getByLabelText('Rota')).toHaveTextContent(detailPath)

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Rota')).toHaveTextContent(listPath)
  expect(screen.getByRole('table')).toBe(table)
  expect(opener).toHaveFocus()
  expect(getClientTransfers).toHaveBeenCalledTimes(calls)
  await user.click(screen.getByRole('button', { name: 'Filtrar transferências' }))
  expect(screen.getByLabelText('Status')).toHaveValue('Concluída')
})

it('keeps list state through browser Back and Forward and closes with the overlay', async () => {
  const user = userEvent.setup()
  renderHistory()
  await screen.findByText('Fornecedor de teste')
  const table = screen.getByRole('table')
  await user.click(screen.getByRole('button', { name: /Ver detalhes/ }))
  await screen.findByRole('dialog')
  await user.click(screen.getByRole('button', { name: 'Voltar no navegador' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('table')).toBe(table)
  await user.click(screen.getByRole('button', { name: 'Avançar no navegador' }))
  await screen.findByRole('dialog')
  expect(screen.getByRole('table')).toBe(table)
  await user.click(screen.getByTestId('drawer-overlay'))
  expect(screen.getByLabelText('Rota')).toHaveTextContent(listPath)
  expect(screen.getByRole('table')).toBe(table)
})

it('shows the list behind a direct or refreshed detail URL and replaces it with the list on close', async () => {
  const user = userEvent.setup()
  renderHistory(detailPath)
  await screen.findByText('Detalhe de teste')
  await screen.findByText('Fornecedor de teste')
  const table = screen.getByRole('table')
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fechar' }))
  expect(screen.getByLabelText('Rota')).toHaveTextContent(/^\/app\/transferencias$/)
  expect(screen.getByRole('table')).toBe(table)
  await user.click(screen.getByRole('button', { name: 'Voltar no navegador' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('retains the list through detail loading and access errors', async () => {
  const user = userEvent.setup()
  let reject!: (error: Error) => void
  vi.mocked(getTransferDetails).mockReturnValue(
    new Promise((_resolve, fail) => {
      reject = fail
    }),
  )
  renderHistory()
  await screen.findByText('Fornecedor de teste')
  const table = screen.getByRole('table')
  await user.click(screen.getByRole('button', { name: /Ver detalhes/ }))
  expect(await screen.findByText('Carregando detalhes...')).toBeInTheDocument()
  expect(screen.getByRole('table')).toBe(table)
  await act(async () => {
    reject(new TransferDetailsError(403, 'COMPANY_ACCESS_REQUIRED', 'denied'))
  })
  expect(await within(screen.getByRole('dialog')).findByRole('alert')).toBeInTheDocument()
  expect(screen.getByRole('table')).toBe(table)
  await user.keyboard('{Escape}')
  expect(screen.getByLabelText('Rota')).toHaveTextContent(listPath)
})

it('keeps create-only direct details accessible without requesting a forbidden list', async () => {
  session.user!.companyAccess!.permissions = ['TRANSFER_CREATE']
  const user = userEvent.setup()
  renderHistory(detailPath)
  expect(await screen.findByText('Detalhe de teste')).toBeInTheDocument()
  expect(getClientTransfers).not.toHaveBeenCalled()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fechar' }))
  expect(await screen.findByRole('heading', { name: 'Dashboard de destino' })).toBeInTheDocument()
  expect(screen.getByLabelText('Rota')).toHaveTextContent('/app/dashboard')
})

it('preserves the list permission guard without issuing a list request', async () => {
  session.user!.companyAccess!.permissions = ['TRANSFER_CREATE']
  renderHistory()
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Seu perfil de acesso não permite consultar transferências.',
  )
  expect(getClientTransfers).not.toHaveBeenCalled()
})

it('keeps anonymous direct details behind login without reading transfers', async () => {
  session.status = 'anonymous'
  session.user = null
  renderHistory(detailPath)
  expect(await screen.findByRole('heading', { name: 'Bem-vindo à V-Stable!' })).toBeInTheDocument()
  expect(getClientTransfers).not.toHaveBeenCalled()
  expect(getTransferDetails).not.toHaveBeenCalled()
})
