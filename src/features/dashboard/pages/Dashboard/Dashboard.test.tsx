import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
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

// Hoje em São Paulo: 03/11/2026. O padrão "Últimos 6 meses" começa em 01/06/2026.
const DEFAULT_PERIOD = 'startDate=2026-06-01&endDate=2026-11-03'

const summary = {
  currency: 'BRL',
  startDate: '2026-06-01',
  endDate: '2026-11-03',
  amount: '-10.00',
  referenceSpreadPercentage: '4.00',
  averageEffectiveSpreadPercentage: null,
  incomplete: false,
  incompleteOperations: 0,
}
const series = {
  currency: 'BRL',
  granularity: 'MONTH',
  startDate: '2026-06-01',
  endDate: '2026-11-03',
  total: '0.00',
  points: [] as { month: string; amount: string }[],
  incompleteOperations: 0,
}
const emptyPage = { content: [], number: 0, size: 5, totalElements: 0, totalPages: 0 }

function responses(url: string): unknown {
  const path = url.split('?')[0]
  if (path === '/v1/balance') return { availableBalanceBrl: '25000.00' }
  if (path === '/v1/companies/summaries')
    return [{ id: 'c1', legalName: 'Alfa Ltda', tradeName: 'Alfa', cnpj: '1' }]
  if (path.endsWith('/transaction-volume')) return { transactedVolumeBrl: '5022.50' }
  if (path.endsWith('/summary')) return summary
  if (path.endsWith('/settlements')) return emptyPage
  return series
}
const reply = (url: string) => new Response(JSON.stringify(responses(url)))
const calledUrls = (fetcher: ReturnType<typeof vi.fn>) =>
  fetcher.mock.calls.map(([url]) => url as string)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-03T15:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('loads real contracts, preserves negative savings and shows empty states', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => reply(url)),
  )
  render(<Dashboard />)
  expect(await screen.findByText(/-R\$\s*10,00/)).toBeInTheDocument()
  expect(await screen.findByText('Nenhuma liquidação registrada.')).toBeInTheDocument()
  expect(await screen.findAllByText('Nenhuma operação no período.')).toHaveLength(2)
  expect(screen.getByText('01/06/2026 a 03/11/2026')).toBeInTheDocument()
  expect(screen.getByText('Estimativa com spread de referência de 4,00%.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Gerar extrato completo' })).toBeInTheDocument()
})

it('requests every widget with the default period of the last six months', async () => {
  const fetcher = vi.fn(async (url: string) => reply(url))
  vi.stubGlobal('fetch', fetcher)
  render(<Dashboard />)
  await screen.findByText('Nenhuma liquidação registrada.')

  expect(calledUrls(fetcher)).toEqual(
    expect.arrayContaining([
      `/v1/dashboard/summary?${DEFAULT_PERIOD}`,
      `/v1/dashboard/remittance-volume?${DEFAULT_PERIOD}`,
      `/v1/dashboard/savings-history?${DEFAULT_PERIOD}`,
      `/v1/dashboard/settlements?${DEFAULT_PERIOD}&page=0&size=5`,
      `/v1/dashboard/transaction-volume?${DEFAULT_PERIOD}`,
    ]),
  )
})

it('updates every widget together when a filter is applied, and restores the default on clear', async () => {
  const fetcher = vi.fn(async (url: string) => reply(url))
  vi.stubGlobal('fetch', fetcher)
  render(<Dashboard />)
  await screen.findByText('Nenhuma liquidação registrada.')

  fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'THIS_MONTH' } })
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

  const thisMonth = 'startDate=2026-11-01&endDate=2026-11-03'
  await waitFor(() =>
    expect(calledUrls(fetcher)).toEqual(
      expect.arrayContaining([
        `/v1/dashboard/summary?${thisMonth}`,
        `/v1/dashboard/remittance-volume?${thisMonth}`,
        `/v1/dashboard/savings-history?${thisMonth}`,
        `/v1/dashboard/settlements?${thisMonth}&page=0&size=5`,
        `/v1/dashboard/transaction-volume?${thisMonth}`,
      ]),
    ),
  )
  expect(await screen.findByText('01/11/2026 a 03/11/2026')).toBeInTheDocument()

  fetcher.mockClear()
  fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))

  await waitFor(() =>
    expect(calledUrls(fetcher)).toContain(`/v1/dashboard/summary?${DEFAULT_PERIOD}`),
  )
  expect(await screen.findByText('01/06/2026 a 03/11/2026')).toBeInTheDocument()
})

it('blocks an invalid period without requesting new data', async () => {
  const fetcher = vi.fn(async (url: string) => reply(url))
  vi.stubGlobal('fetch', fetcher)
  render(<Dashboard />)
  await screen.findByText('Nenhuma liquidação registrada.')
  fetcher.mockClear()

  fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'CUSTOM' } })
  fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-03-01' } })
  fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-01-01' } })
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

  expect(screen.getByRole('alert')).toHaveTextContent(
    'A data inicial não pode ser posterior à data final.',
  )
  expect(fetcher).not.toHaveBeenCalled()
})

it('returns to the first settlements page when the filters change', async () => {
  const page = { ...emptyPage, content: [settlement()], totalElements: 12, totalPages: 3 }
  const fetcher = vi.fn(async (url: string) =>
    url.includes('/settlements') ? new Response(JSON.stringify(page)) : reply(url),
  )
  vi.stubGlobal('fetch', fetcher)
  render(<Dashboard />)
  await screen.findByText('Shenzhen AeroCrop Tech')
  fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))
  await waitFor(() =>
    expect(calledUrls(fetcher)).toContain(
      `/v1/dashboard/settlements?${DEFAULT_PERIOD}&page=1&size=5`,
    ),
  )

  fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'ALL' } })
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

  await waitFor(() =>
    expect(calledUrls(fetcher)).toContain(
      '/v1/dashboard/settlements?endDate=2026-11-03&page=0&size=5',
    ),
  )
})

it('uses administrative endpoints, filters by company and omits client-only fields', async () => {
  const fetcher = vi.fn(async (url: string) => reply(url))
  vi.stubGlobal('fetch', fetcher)
  render(<Dashboard admin />)
  expect(await screen.findByText('Nenhuma liquidação registrada.')).toBeInTheDocument()
  expect(screen.queryByText('Beneficiário / Destino')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Gerar extrato completo' })).not.toBeInTheDocument()
  expect(
    calledUrls(fetcher).every(
      (url) => url.startsWith('/v1/admin/dashboard/') || url === '/v1/companies/summaries',
    ),
  ).toBe(true)

  const company = screen.getByLabelText('Empresa')
  await waitFor(() => expect(company).toBeEnabled())
  fireEvent.change(company, { target: { value: 'c1' } })
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

  const scoped = `companyId=c1&${DEFAULT_PERIOD}`
  await waitFor(() =>
    expect(calledUrls(fetcher)).toEqual(
      expect.arrayContaining([
        `/v1/admin/dashboard/summary?${scoped}`,
        `/v1/admin/dashboard/remittance-volume?${scoped}`,
        `/v1/admin/dashboard/savings-history?${scoped}`,
        `/v1/admin/dashboard/settlements?${scoped}&page=0&size=5`,
        `/v1/admin/dashboard/transaction-volume?${scoped}`,
      ]),
    ),
  )
})

it('never offers a company filter to the client nor sends a company', async () => {
  const fetcher = vi.fn(async (url: string) => reply(url))
  vi.stubGlobal('fetch', fetcher)
  render(<Dashboard />)
  await screen.findByText('Nenhuma liquidação registrada.')

  expect(screen.queryByLabelText('Empresa')).not.toBeInTheDocument()
  expect(calledUrls(fetcher).some((url) => url.includes('companyId'))).toBe(false)
  expect(calledUrls(fetcher)).not.toContain('/v1/companies/summaries')
})

it('shows the error of each block and permits retry after API errors', async () => {
  const fetcher = vi.fn(async () => new Response('{}', { status: 500 }))
  vi.stubGlobal('fetch', fetcher)
  render(<Dashboard />)
  await screen.findAllByText('Não foi possível carregar os dados.')
  fetcher.mockImplementation(async (url?: string) =>
    url?.includes('/summary')
      ? new Response(
          JSON.stringify({ ...summary, amount: '0.00', incomplete: true, incompleteOperations: 2 }),
        )
      : reply(url ?? ''),
  )
  fireEvent.click(
    within(screen.getByRole('region', { name: 'Economia acumulada' })).getByText(
      'Tentar novamente',
    ),
  )
  expect(await screen.findByText('R$ 0,00')).toBeInTheDocument()
  expect(
    screen.getByText(/2 operação\(ões\) sem valor ou tarifa registrados ficaram fora da soma/),
  ).toBeInTheDocument()
})

it('accepts settlement pages beyond the old artificial limit', () => {
  expect(() =>
    settlementsSchema.parse({ ...emptyPage, size: 10, totalElements: 210, totalPages: 21 }),
  ).not.toThrow()
})

it('ignores a stale chart response after a rapid filter change', async () => {
  let resolveOld!: (response: Response) => void
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === `/v1/dashboard/remittance-volume?${DEFAULT_PERIOD}`)
        return new Promise<Response>((resolve) => {
          resolveOld = resolve
        })
      return Promise.resolve(reply(url))
    }),
  )
  render(<Dashboard />)
  fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'THIS_MONTH' } })
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
  await screen.findAllByText('Nenhuma operação no período.')
  resolveOld(
    new Response(JSON.stringify({ ...series, points: [{ month: '2026-10', amount: '999.00' }] })),
  )
  await waitFor(() => expect(screen.queryByText(/999,00/)).not.toBeInTheDocument())
})

it('shows balance and transacted volume beside the accumulated savings for the client', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => reply(url)),
  )
  render(<Dashboard />)

  const balance = await screen.findByText('R$ 25.000,00')
  const volume = await screen.findByText('R$ 5.022,50')
  const savings = screen.getByRole('region', { name: 'Economia acumulada' })
  const row = savings.parentElement!
  expect(row).toContainElement(balance)
  expect(row).toContainElement(volume)
  expect(
    Array.from(row.children).map((card) =>
      card.textContent?.split(/R\$|\(|\d|Carregando/)[0].trim(),
    ),
  ).toEqual(['Saldo Disponível', 'Economia Acumulada', 'Volume Transacionado'])
})

it('shows the consolidated transacted volume to the administrator, without the balance', async () => {
  const fetcher = vi.fn(async (url: string) => reply(url))
  vi.stubGlobal('fetch', fetcher)
  render(<Dashboard admin />)

  expect(await screen.findByText('R$ 5.022,50')).toBeInTheDocument()
  expect(screen.queryByText('Saldo Disponível')).not.toBeInTheDocument()
  expect(calledUrls(fetcher)).toContain(`/v1/admin/dashboard/transaction-volume?${DEFAULT_PERIOD}`)
  expect(calledUrls(fetcher).some((url) => url === '/v1/balance')).toBe(false)
})

function settlement(overrides: Record<string, unknown> = {}) {
  return {
    id: 's1',
    companyId: 'c1',
    companyName: 'Alfa',
    settledAt: '2026-10-20T15:30:00Z',
    createdAt: '2026-10-20T15:00:00Z',
    direction: 'PAYMENT',
    counterparty: 'Shenzhen AeroCrop Tech',
    destination: 'CN • Agricultural Bank of China',
    amount: '10000.00',
    currency: 'USD',
    amountBrl: '54200.00',
    exchangeRate: '5.420000',
    feeBrl: '216.80',
    savings: '1951.20',
    status: 'SETTLED',
    ...overrides,
  }
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
      : reply(url),
  )
}

it('lists the latest settlements with counterparty, date, type, amount and status', async () => {
  vi.stubGlobal(
    'fetch',
    withSettlements([
      settlement(),
      settlement({
        id: 's2',
        settledAt: null,
        createdAt: null,
        direction: 'RECEIPT',
        counterparty: null,
        amount: '18420.00',
        currency: 'BRL',
      }),
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

it('dates a pending settlement by its creation', async () => {
  vi.stubGlobal(
    'fetch',
    withSettlements([settlement({ settledAt: null, createdAt: '2026-10-21T13:00:00Z' })]),
  )
  render(<Dashboard />)

  expect(await screen.findByText('21 out 2026 • 10:00')).toBeInTheDocument()
})

it('shows the administrator settlements without the counterparty column', async () => {
  vi.stubGlobal('fetch', withSettlements([settlement()]))
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
        : reply(url),
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
      settlement(),
      settlement({ id: 's2', status: 'PROCESSING' }),
      settlement({ id: 's3', status: 'FAILED' }),
    ]),
  )
  render(<Dashboard />)

  expect(await screen.findByText('Concluída')).toBeInTheDocument()
  expect(screen.getByText('Processando')).toBeInTheDocument()
  expect(screen.getByText('Com falha')).toBeInTheDocument()
})

it('names the chart series, flags incomplete data and formats the value axis in compact reais', async () => {
  for (const key of Object.keys(chartProps)) delete chartProps[key]
  const filled = {
    ...series,
    total: '1640.00',
    points: [
      { month: '2026-09', amount: '0.00' },
      { month: '2026-10', amount: '1640.00' },
    ],
    incompleteOperations: 1,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.includes('remittance-volume') || url.includes('savings-history')
        ? new Response(JSON.stringify(filled))
        : reply(url),
    ),
  )
  render(<Dashboard />)
  await waitFor(() => expect(chartProps.Bar?.length).toBeTruthy())

  expect(screen.getAllByText(/Dados incompletos/)).toHaveLength(2)
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
