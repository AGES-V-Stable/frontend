import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { BalanceCard } from '@/features/dashboard/components/BalanceCard'

describe('BalanceCard', () => {
  it('shows a loading status and no value while the balance is loading', () => {
    render(<BalanceCard state={{ status: 'loading' }} onRetry={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Saldo Disponível (BRL)' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Carregando saldo...')
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument()
  })

  it.each([
    ['485200.00', /R\$\s485\.200,00/],
    ['0.00', /R\$\s0,00/],
    ['10.25', /R\$\s10,25/],
  ])('formats the balance %s in BRL without losing cents', (balance, expected) => {
    render(<BalanceCard state={{ status: 'ready', balance }} onRetry={vi.fn()} />)

    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('shows an unavailable label when the balance cannot be formatted', () => {
    render(<BalanceCard state={{ status: 'ready', balance: 'abc' }} onRetry={vi.fn()} />)

    expect(screen.getByText('Indisponível')).toBeInTheDocument()
  })

  it('shows the error and lets the user retry', async () => {
    const onRetry = vi.fn()
    render(<BalanceCard state={{ status: 'error', message: 'Falhou.' }} onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Falhou.')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
