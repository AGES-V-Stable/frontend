import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MockTopUp } from './MockTopUp'
import { addMockTopUp } from '@/features/dashboard/api/balance'
import { useBalance } from '@/features/dashboard/hooks/useBalance'
import { useSession } from '@/features/auth'
import { HttpError } from '@/shared/http/httpClient'

const navigate = vi.fn()
vi.mock('react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/features/dashboard/api/balance', () => ({ addMockTopUp: vi.fn() }))
vi.mock('@/features/dashboard/hooks/useBalance', () => ({ useBalance: vi.fn() }))
vi.mock('@/features/auth', () => ({ useSession: vi.fn() }))

const addCredit = vi.mocked(addMockTopUp)
const session = vi.mocked(useSession)
const balance = vi.mocked(useBalance)
const retry = vi.fn()

function owner(role: 'OWNER' | 'OPERATOR' | 'VIEWER' = 'OWNER') {
  return {
    id: 'u1',
    name: 'Ana Silva',
    email: 'ana@example.test',
    companyId: 'c1',
    accountType: 'USER' as const,
    roles: ['ROLE_USER'],
    companyAccess: {
      membershipId: 'm1',
      companyId: 'c1',
      role,
      status: 'ACTIVE' as const,
      permissions: ['BALANCE_READ'],
      version: 1,
    },
  }
}

const amount = () => screen.getByRole('textbox', { name: 'Valor a adicionar (R$)' })
const submit = () => screen.getByRole('button', { name: 'Confirmar crédito simulado' })

describe('MockTopUp', () => {
  beforeEach(() => {
    navigate.mockReset()
    retry.mockReset()
    addCredit.mockReset()
    session.mockReturnValue({
      status: 'authenticated',
      user: owner(),
      company: null,
      error: null,
      retry: vi.fn(),
    })
    balance.mockReturnValue({ state: { status: 'ready', balance: '2.50' }, retry })
  })

  it('shows server balance and simulated-credit warning', () => {
    render(<MockTopUp />)
    expect(screen.getByRole('heading', { name: 'Adicionar saldo' })).toBeVisible()
    expect(screen.getByText(/nenhum pagamento ou transferência real/)).toBeVisible()
    expect(screen.getByText('R$ 2,50')).toBeVisible()
  })

  it('shows precise projected amount and posts the pt-BR amount once', async () => {
    addCredit.mockResolvedValue({ creditedAmountBrl: '10.25', availableBalanceBrl: '12.75' })
    render(<MockTopUp />)
    await userEvent.type(amount(), '10,25')
    expect(screen.getByText('R$ 12,75')).toBeVisible()
    await userEvent.click(submit())
    expect(addCredit).toHaveBeenCalledExactlyOnceWith('10.25')
    expect(await screen.findByRole('status')).toHaveTextContent('12,75')
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it.each(['', '0', '-10', '1,234', '1.2', '10.000.00'])(
    'rejects invalid amount %s without making a request',
    async (invalid) => {
      render(<MockTopUp />)
      if (invalid) await userEvent.type(amount(), invalid)
      await userEvent.click(submit())
      expect(screen.getByRole('alert')).toHaveTextContent('valor positivo')
      expect(addCredit).not.toHaveBeenCalled()
    },
  )

  it('keeps the typed amount and balance unchanged on API failure', async () => {
    addCredit.mockRejectedValue(new HttpError('denied', 404, {}, 'SIMULATED_DEPOSITS_DISABLED'))
    render(<MockTopUp />)
    await userEvent.type(amount(), '10,25')
    await userEvent.click(submit())
    expect(await screen.findByRole('alert')).toHaveTextContent('não está disponível')
    expect(amount()).toHaveValue('10,25')
    expect(screen.getByText('R$ 2,50')).toBeVisible()
    expect(retry).not.toHaveBeenCalled()
  })

  it('blocks duplicate submission while the request is pending', async () => {
    addCredit.mockReturnValue(new Promise(() => undefined))
    render(<MockTopUp />)
    await userEvent.type(amount(), '10,25')
    await userEvent.click(submit())
    expect(screen.getByRole('button', { name: 'Adicionando...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled()
    expect(addCredit).toHaveBeenCalledTimes(1)
  })

  it('does not offer credit to an operator', () => {
    session.mockReturnValue({
      status: 'authenticated',
      user: owner('OPERATOR'),
      company: null,
      error: null,
      retry: vi.fn(),
    })
    render(<MockTopUp />)
    expect(screen.queryByRole('button', { name: 'Confirmar crédito simulado' })).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('Apenas o proprietário')
  })

  it('shows retry for failure to load existing balance', async () => {
    balance.mockReturnValue({ state: { status: 'error', message: 'Falha ao consultar saldo.' }, retry })
    render(<MockTopUp />)
    expect(submit()).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Tentar carregar novamente' }))
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('returns to the company dashboard', async () => {
    render(<MockTopUp />)
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(navigate).toHaveBeenCalledWith('/app/dashboard')
  })

  it('prevents overflow before calling the API', async () => {
    balance.mockReturnValue({
      state: { status: 'ready', balance: '9999999999999.99' },
      retry,
    })
    render(<MockTopUp />)
    await userEvent.type(amount(), '0,01')
    await userEvent.click(submit())
    expect(screen.getByRole('alert')).toHaveTextContent('capacidade técnica')
    expect(addCredit).not.toHaveBeenCalled()
  })
})
