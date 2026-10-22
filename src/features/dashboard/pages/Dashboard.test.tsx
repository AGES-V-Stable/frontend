import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import Dashboard from './Dashboard'
import { settlementsSchema } from '../api/dashboard'

vi.mock('recharts', () => ({
  ResponsiveContainer: () => null,
  Bar: () => null,
  BarChart: () => null,
  CartesianGrid: () => null,
  Area: () => null,
  AreaChart: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}))
function responses(url: string) {
  if (url.endsWith('/summary'))
    return {
      year: 2026,
      currency: 'BRL',
      amount: '-10.00',
      knownSubtotal: '-10.00',
      incomplete: false,
      undatedOperations: 0,
    }
  if (url.includes('/settlements'))
    return { content: [], number: 0, size: 5, totalElements: 0, totalPages: 0 }
  return {
    currency: 'BRL',
    period: 'SIX_MONTHS',
    points: [{ month: '2026-10', amount: '0.00', incomplete: false }],
    undatedOperations: 0,
  }
}
afterEach(() => vi.unstubAllGlobals())
it('loads real contracts, preserves negative savings and shows empty states', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => new Response(JSON.stringify(responses(url)))),
  )
  render(<Dashboard />)
  expect(await screen.findByText(/-R\$\s*10,00/)).toBeInTheDocument()
  expect(await screen.findByText('Nenhuma liquidação registrada.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Gerar extrato completo' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Período — Volume de Remessas (BRL)'), {
    target: { value: 'THIS_MONTH' },
  })
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('period=THIS_MONTH'),
      expect.anything(),
    ),
  )
})
it('uses administrative endpoints and omits counterparty fields and PDF', async () => {
  const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(responses(url))))
  vi.stubGlobal('fetch', fetcher)
  render(<Dashboard admin />)
  expect(await screen.findByText('Nenhuma liquidação registrada.')).toBeInTheDocument()
  expect(screen.queryByText('Beneficiário / Destino')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Gerar extrato completo' })).not.toBeInTheDocument()
  expect(fetcher.mock.calls.every(([url]) => url.startsWith('/v1/admin/dashboard/'))).toBe(true)
})
it('shows unavailable amounts and permits retry after API errors', async () => {
  const fetcher = vi.fn(async () => new Response('{}', { status: 500 }))
  vi.stubGlobal('fetch', fetcher)
  render(<Dashboard />)
  await screen.findAllByText('Não foi possível carregar os dados.')
  fetcher.mockImplementation(
    async (url?: string) =>
      new Response(
        JSON.stringify(
          url?.endsWith('summary')
            ? { ...responses('/summary'), amount: null, incomplete: true }
            : responses(url ?? ''),
        ),
      ),
  )
  fireEvent.click(screen.getAllByText('Tentar novamente')[0])
  expect(await screen.findByText('Indisponível')).toBeInTheDocument()
})
it('rejects responses that exceed the table page limit', () => {
  expect(() =>
    settlementsSchema.parse({ content: [], number: 0, size: 5, totalElements: 21, totalPages: 5 }),
  ).toThrow()
})

it('ignores a stale chart response after a rapid period change', async () => {
  let resolveOld!: (response: Response) => void
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('remittance-volume?period=SIX_MONTHS'))
        return new Promise<Response>((resolve) => {
          resolveOld = resolve
        })
      return Promise.resolve(new Response(JSON.stringify(responses(url))))
    }),
  )
  render(<Dashboard />)
  fireEvent.change(screen.getByLabelText('Período — Volume de Remessas (BRL)'), {
    target: { value: 'THIS_MONTH' },
  })
  await screen.findAllByText('Nenhuma operação no período.')
  resolveOld(
    new Response(
      JSON.stringify({
        ...responses('series'),
        points: [{ month: '2026-10', amount: '999.00', incomplete: false }],
      }),
    ),
  )
  await waitFor(() => expect(screen.queryByText(/999,00/)).not.toBeInTheDocument())
})
