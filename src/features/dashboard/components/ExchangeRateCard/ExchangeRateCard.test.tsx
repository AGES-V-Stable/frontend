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
const stale: ExchangeRate = {
  ...current,
  quoteCurrency: 'USDT',
  rate: '5.40',
  fetchedAt: '2026-11-12T10:00:00Z',
  status: 'STALE',
}
const unavailable: ExchangeRate = {
  baseCurrency: 'BRL',
  quoteCurrency: 'BRLA',
  rate: null,
  fetchedAt: null,
  status: 'UNAVAILABLE',
}

const renderRates = (rates: ExchangeRate[]) =>
  render(<ExchangeRateCard state={{ status: 'ready', rates }} onRetry={vi.fn()} />)
const card = () => screen.getByRole('region', { name: 'Câmbio Atual' })
const pairSelect = () => screen.getByRole('combobox', { name: 'Par de moedas' })

describe('ExchangeRateCard', () => {
  it('shows the first pair with its direction, reference rate and update time', () => {
    renderRates([current, stale])

    expect(pairSelect()).toHaveValue('BRL-USDC')
    expect(
      within(pairSelect())
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['BRL → USDC', 'BRL → USDT'])
    expect(screen.getByText(/^1 USDC = R\$\s5,4700$/)).toBeInTheDocument()
    expect(screen.getByText(formatLocalDateTime(current.fetchedAt))).toHaveAttribute(
      'datetime',
      current.fetchedAt,
    )
    expect(card()).toHaveTextContent(/Atualizado em \d{2}\/\d{2}\/2026 \d{2}:\d{2}/)
    expect(card()).toHaveTextContent('Taxa de referência de mercado, sem tarifas.')
    expect(screen.queryByText('Cotação desatualizada')).not.toBeInTheDocument()
  })

  it('switches the pair shown through the dropdown', async () => {
    renderRates([current, stale, unavailable])

    await userEvent.selectOptions(pairSelect(), 'BRL-USDT')

    expect(screen.getByText(/^1 USDT = R\$\s5,4000$/)).toBeInTheDocument()
    expect(screen.getByText('Cotação desatualizada')).toBeInTheDocument()
    expect(card()).toHaveTextContent('Atualizado em')

    await userEvent.selectOptions(pairSelect(), 'BRL-BRLA')

    expect(screen.getByText('Cotação indisponível')).toBeInTheDocument()
    expect(card()).not.toHaveTextContent('Atualizado em')
    expect(screen.queryByText('Cotação desatualizada')).not.toBeInTheDocument()
  })

  it('shows an unavailable rate without any number or date', () => {
    renderRates([unavailable])

    expect(screen.getByText('Cotação indisponível')).toBeInTheDocument()
    expect(card()).not.toHaveTextContent(/\d/)
  })

  it('rounds the rate from the decimal string without floating point loss', () => {
    renderRates([{ ...current, rate: '12345678901234.56785' }])

    expect(screen.getByText(/^1 USDC = R\$\s12\.345\.678\.901\.234,5679$/)).toBeInTheDocument()
  })

  it('formats a rate quoted in a currency without an ISO code', () => {
    renderRates([{ ...current, baseCurrency: 'BRLA', rate: '1.0001' }])

    expect(screen.getByText(/^1 USDC = BRLA\s1,0001$/)).toBeInTheDocument()
  })

  it('treats a malformed rate as unavailable instead of inventing a value', () => {
    renderRates([{ ...current, rate: 'abc' }])

    expect(screen.getByText('Cotação indisponível')).toBeInTheDocument()
    expect(card()).not.toHaveTextContent('Atualizado em')
  })

  it('explains when there are no pairs, without a dropdown', () => {
    renderRates([])

    expect(screen.getByText('Nenhuma cotação disponível')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('shows a loading status and no dropdown while loading', () => {
    render(<ExchangeRateCard state={{ status: 'loading' }} onRetry={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando cotações...')
    expect(card()).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('shows the request error and lets the user retry', async () => {
    const onRetry = vi.fn()
    render(<ExchangeRateCard state={{ status: 'error', message: 'Falhou.' }} onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Falhou.')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
