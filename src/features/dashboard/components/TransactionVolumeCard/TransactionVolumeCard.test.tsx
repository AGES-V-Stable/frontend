import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TransactionVolumeCard } from '@/features/dashboard/components/TransactionVolumeCard'

describe('TransactionVolumeCard', () => {
  it('shows a loading status and no value while the volume is loading', () => {
    render(<TransactionVolumeCard state={{ status: 'loading' }} onRetry={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Volume Transacionado' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Carregando volume...')
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument()
  })

  it.each([
    ['412000.00', /R\$\s412\.000,00/],
    ['0.00', /R\$\s0,00/],
    ['10.25', /R\$\s10,25/],
  ])('formats the volume %s in BRL without losing cents', (volume, expected) => {
    render(<TransactionVolumeCard state={{ status: 'ready', volume }} onRetry={vi.fn()} />)

    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('shows an unavailable label when the volume cannot be formatted', () => {
    render(<TransactionVolumeCard state={{ status: 'ready', volume: 'abc' }} onRetry={vi.fn()} />)

    expect(screen.getByText('Indisponível')).toBeInTheDocument()
  })

  it('shows the error and lets the user retry', async () => {
    const onRetry = vi.fn()
    render(
      <TransactionVolumeCard state={{ status: 'error', message: 'Falhou.' }} onRetry={onRetry} />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Falhou.')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
