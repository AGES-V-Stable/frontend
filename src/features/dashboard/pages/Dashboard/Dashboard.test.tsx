import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Dashboard } from './Dashboard'
import { settlementsSchema } from '@/features/dashboard/api/dashboard'

// Recharts não desenha no jsdom; o mock repassa os filhos e guarda as props de cada série e eixo.
const chartProps = vi.hoisted(() => ({}) as Record<string, Record<string, unknown>[]>)
vi.mock('recharts', async () => {
  const { createElement, Fragment } = await import('react')
  const capture =
    (name: string, withChildren = false) =>
    (props: Record<string, unknown>) => {
      ;(chartProps[name] ??= []).push(props)
      return withChildren ? createElement(Fragment, null, props.children as never) : null
    }
  return {
    ResponsiveContainer: capture('ResponsiveContainer', true),
    BarChart: capture('BarChart', true),
    AreaChart: capture('AreaChart', true),
    Bar: capture('Bar'),
    Area: capture('Area'),
    CartesianGrid: capture('CartesianGrid'),
    Tooltip: capture('Tooltip'),
    XAxis: capture('XAxis'),
    YAxis: capture('YAxis'),
  }
})
function responses(url: string) {
  if (url === '/v1/balance') return { availableBalanceBrl: '25000.00' }
  if (url.startsWith('/v1/dashboard/transaction-volume')) return { transactedVolumeBrl: '5022.50' }
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
  fireEvent.click(
    within(screen.getByRole('region', { name: 'Economia acumulada' })).getByText(
      'Tentar novamente',
    ),
  )
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

it('shows balance and transacted volume beside the accumulated savings for the client', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => new Response(JSON.stringify(responses(url)))),
  )
  render(<Dashboard />)

  const balance = await screen.findByText('R$ 25.000,00')
  const volume = await screen.findByText('R$ 5.022,50')
  const savings = screen.getByRole('region', { name: 'Economia acumulada' })
  const row = savings.parentElement!
  expect(row).toContainElement(balance)
  expect(row).toContainElement(volume)
  expect(
    Array.from(row.children).map((card) => card.textContent?.split(/R\$|\(/)[0].trim()),
  ).toEqual(['Saldo Disponível', 'Economia Acumulada', 'Volume Transacionado'])
})

it('omits balance and transacted volume for the administrator, without requesting them', async () => {
  const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(responses(url))))
  vi.stubGlobal('fetch', fetcher)
  render(<Dashboard admin />)

  expect(await screen.findByText('Nenhuma liquidação registrada.')).toBeInTheDocument()
  expect(screen.queryByText('Saldo Disponível (BRL)')).not.toBeInTheDocument()
  expect(screen.queryByText('Volume Transacionado')).not.toBeInTheDocument()
  expect(fetcher.mock.calls.some(([url]) => url === '/v1/balance')).toBe(false)
})

const settlement = {
  id: 's1',
  date: '2026-10-20T15:30:00Z',
  direction: 'PAYMENT',
  counterparty: 'Shenzhen AeroCrop Tech',
  destination: 'CN • Agricultural Bank of China',
  amount: '10000.00',
  currency: 'USD',
  totalBrl: '54200.00',
  feeBrl: '216.80',
  rate: '5.42',
  savings: '1951.20',
  status: 'SETTLED',
}

function withSettlements(rows: unknown[], totalElements = rows.length) {
  return vi.fn(async (url: string) =>
    url.includes('/settlements')
      ? new Response(
          JSON.stringify({
            content: rows,
            number: 0,
            size: 5,
            totalElements,
            totalPages: Math.ceil(totalElements / 5),
          }),
        )
      : new Response(JSON.stringify(responses(url))),
  )
}

it('lists the latest settlements with counterparty, date, type, amount and status', async () => {
  vi.stubGlobal(
    'fetch',
    withSettlements([
      settlement,
      {
        ...settlement,
        id: 's2',
        date: null,
        direction: 'RECEIPT',
        counterparty: null,
        amount: '18420.00',
        currency: 'BRL',
      },
    ]),
  )
  render(<Dashboard />)

  expect(await screen.findByText('Shenzhen AeroCrop Tech')).toBeInTheDocument()
  expect(screen.getAllByText('CN • Agricultural Bank of China')).toHaveLength(2)
  expect(screen.getByText(/US\$\s*10\.000,00/)).toBeInTheDocument()
  expect(screen.getByText('Pagamento')).toBeInTheDocument()
  expect(screen.getByText('Recebimento')).toBeInTheDocument()
  expect(screen.getByText('Não registrado')).toBeInTheDocument()
  expect(screen.getByText('Não registrada')).toBeInTheDocument()
  expect(screen.getAllByText('Concluída')).toHaveLength(2)
})

it('requests the next settlements page from the backend', async () => {
  const fetcher = withSettlements([settlement, settlement, settlement, settlement, settlement], 12)
  vi.stubGlobal('fetch', fetcher)
  render(<Dashboard />)

  await screen.findAllByText('Shenzhen AeroCrop Tech')
  fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))

  await waitFor(() =>
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining('/v1/dashboard/settlements?page=1&size=5'),
      expect.anything(),
    ),
  )
})

it('shows the administrator settlements without the counterparty column', async () => {
  vi.stubGlobal('fetch', withSettlements([settlement]))
  render(<Dashboard admin />)

  expect(await screen.findByText('Pagamento')).toBeInTheDocument()
  expect(screen.queryByText('Shenzhen AeroCrop Tech')).not.toBeInTheDocument()
})

it('generates the full statement and warns when the download fails', async () => {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:extrato'),
    revokeObjectURL: vi.fn(),
  })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  let statementStatus = 200
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.endsWith('/statement.pdf')
        ? statementStatus === 200
          ? new Response('%PDF-1.4', { headers: { 'Content-Type': 'application/pdf' } })
          : new Response('{}', { status: statementStatus })
        : new Response(JSON.stringify(responses(url))),
    ),
  )
  render(<Dashboard />)
  const button = await screen.findByRole('button', { name: 'Gerar extrato completo' })

  fireEvent.click(button)
  await waitFor(() => expect(click).toHaveBeenCalledTimes(1))
  expect(
    screen.queryByText('Não foi possível gerar o extrato. Tente novamente.'),
  ).not.toBeInTheDocument()

  statementStatus = 500
  fireEvent.click(await screen.findByRole('button', { name: 'Gerar extrato completo' }))
  expect(
    await screen.findByText('Não foi possível gerar o extrato. Tente novamente.'),
  ).toBeInTheDocument()
  click.mockRestore()
})

it('shows the real status of each settlement', async () => {
  vi.stubGlobal(
    'fetch',
    withSettlements([
      settlement,
      { ...settlement, id: 's2', status: 'PROCESSING' },
      { ...settlement, id: 's3', status: 'FAILED' },
    ]),
  )
  render(<Dashboard />)

  expect(await screen.findByText('Concluída')).toBeInTheDocument()
  expect(screen.getByText('Processando')).toBeInTheDocument()
  expect(screen.getByText('Com falha')).toBeInTheDocument()
})

it('names the chart series and formats the value axis in compact reais', async () => {
  for (const key of Object.keys(chartProps)) delete chartProps[key]
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => new Response(JSON.stringify(responses(url)))),
  )
  render(<Dashboard />)
  await screen.findByText('R$ 25.000,00')
  await waitFor(() => expect(chartProps.Bar?.length).toBeTruthy())

  expect(chartProps.Bar.at(-1)).toMatchObject({ name: 'Volume', dataKey: 'value' })
  expect(chartProps.Area.at(-1)).toMatchObject({ name: 'Economia', dataKey: 'value' })
  const tickFormatter = chartProps.YAxis.at(-1)!.tickFormatter as (value: number) => string
  expect(tickFormatter(340000).replace(/\s/g, ' ')).toBe('R$ 340 mil')
  expect(tickFormatter(2500000).replace(/\s/g, ' ')).toBe('R$ 2,5 mi')
  const formatter = chartProps.Tooltip.at(-1)!.formatter as (
    value: unknown,
    name: unknown,
    item: { payload: { amount: string | null } },
  ) => string
  expect(formatter(1640, 'Economia', { payload: { amount: '1640.00' } })).toMatch(/R\$\s*1\.640,00/)
})
