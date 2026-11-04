import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MetricCard } from '@/features/dashboard/components/MetricCard'

describe('MetricCard', () => {
  it('names the region by its title and shows the value in the accent color', () => {
    render(
      <MetricCard
        title="Economia Acumulada"
        accent="emerald"
        state={{ status: 'ready', value: 'R$ 31.450,00' }}
        footnote="Spread efetivo médio: 0,45%"
      />,
    )

    const region = screen.getByRole('region', { name: 'Economia Acumulada' })
    expect(region).toHaveAttribute('aria-busy', 'false')
    expect(screen.getByText('R$ 31.450,00').className).toContain('text-primary')
    expect(screen.getByText('Spread efetivo médio: 0,45%')).toBeInTheDocument()
  })

  it('announces the loading state', () => {
    render(
      <MetricCard
        title="Saldo"
        accent="neutral"
        state={{ status: 'loading', label: 'Carregando...' }}
      />,
    )

    expect(screen.getByRole('region', { name: 'Saldo' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Carregando...')
  })

  it('shows the error and retries', () => {
    const onRetry = vi.fn()
    render(
      <MetricCard
        title="Volume"
        accent="sky"
        state={{ status: 'error', message: 'Falhou.', onRetry }}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Falhou.')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
