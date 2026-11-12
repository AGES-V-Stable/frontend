import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ExchangeRateCard } from '@/features/dashboard/components/ExchangeRateCard'
import type { ExchangeRate } from '@/features/dashboard/types/exchangeRates'
import { formatLocalDateTime } from '@/shared/utils/formatters'

const current: ExchangeRate = {
  baseCurrency: 'BRL',
  quoteCurrency: 'USDC',
  rate: '5.47000000',
  fetchedAt: '2026-11-12T22:45:00Z',
  status: 'CURRENT',
}

const renderRates = (rates: ExchangeRate[]) =>
  render(<ExchangeRateCard state={{ status: 'ready', rates }} onRetry={vi.fn()} />)

const item = (pair: string) => screen.getByText(pair).closest('li') as HTMLElement

describe('ExchangeRateCard', () => {
  it('identifies the pair, its direction, the reference rate and the update time', () => {
    renderRates([current])

    expect(screen.getByRole('heading', { name: 'Câmbio Atual' })).toBeInTheDocument()
    expect(screen.getByText('Taxas de referência de mercado, sem tarifas.')).toBeInTheDocument()
    const row = item('BRL → USDC')
    expect(within(row).getByText('BRL para USDC')).toBeInTheDocument()
    expect(within(row).getByText(/^1 USDC = R\$\s5,4700$/)).toBeInTheDocument()
    expect(within(row).getByText(formatLocalDateTime(current.fetchedAt))).toHaveAttribute(
      'datetime',
      current.fetchedAt,
    )
    expect(row).toHaveTextContent(/Atualizado em \d{2}\/\d{2}\/2026 \d{2}:\d{2}/)
    expect(within(row).queryByText('Cotação desatualizada')).not.toBeInTheDocument()
  })

  it('rounds the rate from the decimal string without floating point loss', () => {
    renderRates([{ ...current, rate: '12345678901234.56785' }])

    expect(screen.getByText(/^1 USDC = R\$\s12\.345\.678\.901\.234,5679$/)).toBeInTheDocument()
  })

  it('flags a stale rate explicitly, still showing its value and date', () => {
    renderRates([{ ...current, status: 'STALE', fetchedAt: '2026-11-12T10:00:00Z' }])

    const row = item('BRL → USDC')
    expect(within(row).getByText('Cotação desatualizada')).toBeInTheDocument()
    expect(within(row).getByText(/^1 USDC = R\$\s5,4700$/)).toHaveClass('text-slate-500')
    expect(row).toHaveTextContent('Atualizado em')
  })

  it('shows an unavailable rate without any number or date', () => {
    renderRates([
      {
        baseCurrency: 'BRL',
        quoteCurrency: 'USDT',
        rate: null,
        fetchedAt: null,
        status: 'UNAVAILABLE',
      },
    ])

    const row = item('BRL → USDT')
    expect(within(row).getByText('Cotação indisponível')).toBeInTheDocument()
    expect(row).not.toHaveTextContent(/\d/)
    expect(row).not.toHaveTextContent('Atualizado em')
  })

  it('shows every pair with its own situation', () => {
    renderRates([
      current,
      { ...current, quoteCurrency: 'USDT', status: 'STALE' },
      {
        baseCurrency: 'BRL',
        quoteCurrency: 'BRLA',
        rate: null,
        fetchedAt: null,
        status: 'UNAVAILABLE',
      },
    ])

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(within(item('BRL → USDT')).getByText('Cotação desatualizada')).toBeInTheDocument()
    expect(within(item('BRL → BRLA')).getByText('Cotação indisponível')).toBeInTheDocument()
  })

  it('formats a rate quoted in a currency without an ISO code', () => {
    renderRates([{ ...current, baseCurrency: 'BRLA', rate: '1.0001' }])

    expect(screen.getByText(/^1 USDC = BRLA\s1,0001$/)).toBeInTheDocument()
  })

  it('treats a malformed rate as unavailable instead of inventing a value', () => {
    renderRates([{ ...current, rate: 'abc' }])

    expect(screen.getByText('Cotação indisponível')).toBeInTheDocument()
  })

  it('explains when there are no pairs to show', () => {
    renderRates([])

    expect(screen.getByText('Nenhuma cotação disponível no momento.')).toBeInTheDocument()
  })

  it('shows a loading status and no rates while loading', () => {
    render(<ExchangeRateCard state={{ status: 'loading' }} onRetry={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando cotações...')
    expect(screen.getByRole('region', { name: 'Câmbio Atual' })).toHaveAttribute(
      'aria-busy',
      'true',
    )
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('shows the request error and lets the user retry', async () => {
    const onRetry = vi.fn()
    render(<ExchangeRateCard state={{ status: 'error', message: 'Falhou.' }} onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Falhou.')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
