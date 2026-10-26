import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Dashboard } from './Dashboard'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

function stubApi(balance: Response, volume: Response) {
  const fetcher = vi.fn(async (url: string) =>
    url === '/v1/balance' ? balance.clone() : volume.clone(),
  )
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

describe('Dashboard', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows the company balance and transacted volume from the backend', async () => {
    stubApi(json({ availableBalanceBrl: '25000.00' }), json({ transactedVolumeBrl: '5022.50' }))

    render(<Dashboard />)

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(await screen.findByText('R$ 25.000,00')).toBeInTheDocument()
    expect(await screen.findByText('R$ 5.022,50')).toBeInTheDocument()
  })

  it('shows zero instead of hiding the metric when there is no volume', async () => {
    stubApi(json({ availableBalanceBrl: '0.00' }), json({ transactedVolumeBrl: '0.00' }))

    render(<Dashboard />)

    expect(await screen.findAllByText('R$ 0,00')).toHaveLength(2)
  })

  it('keeps each card independent when one request fails and lets it retry', async () => {
    const user = userEvent.setup()
    const fetcher = stubApi(json({}, 500), json({ transactedVolumeBrl: '5022.50' }))

    render(<Dashboard />)

    expect(await screen.findByText('R$ 5.022,50')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o saldo')
    fetcher.mockImplementation(async (url: string) =>
      url === '/v1/balance'
        ? json({ availableBalanceBrl: '1000.00' })
        : json({ transactedVolumeBrl: '5022.50' }),
    )
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('R$ 1.000,00')).toBeInTheDocument()
  })
})
