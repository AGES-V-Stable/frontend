import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { cloneElement, type ReactElement } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { Observability } from './Observability'
import { localDraft } from '../period'

// Exercise real Recharts rendering with fixed dimensions in jsdom.
vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('recharts')>()),
  ResponsiveContainer: ({
    children,
  }: {
    children: ReactElement<{ width: number; height: number }>
  }) => cloneElement(children, { width: 800, height: 288 }),
}))

const event = {
  id: '11111111-1111-4111-8111-111111111111',
  occurredAt: '2026-11-16T12:00:00Z',
  severity: 'INFO',
  module: 'company',
  action: 'company.creation.completed',
  actorId: '22222222-2222-4222-8222-222222222222',
  entityType: 'company',
  entityId: '33333333-3333-4333-8333-333333333333',
  outcome: 'success',
  failed: false,
  durationMs: 34,
  message: 'Application event: company.creation.completed',
  correlationId: '44444444-4444-4444-8444-444444444444',
  source: 'backend',
  metadata: { method: 'POST' },
}
const page = {
  content: [event],
  page: 0,
  size: 25,
  totalElements: 26,
  totalPages: 2,
  errors: 3,
  failuresByModule: [{ module: 'transfer', failures: 2 }],
}
const summary = {
  from: '2026-11-16T11:00:00Z',
  to: '2026-11-16T13:00:00Z',
  interval: 'hour',
  generatedAt: '2026-11-16T13:00:01Z',
  total: 26,
  errors: 3,
  warnings: 2,
  infos: 21,
  series: [
    { from: '2026-11-16T11:00:00Z', to: '2026-11-16T12:00:00Z', error: 3, warn: 2, info: 20 },
    { from: '2026-11-16T12:00:00Z', to: '2026-11-16T13:00:00Z', error: 0, warn: 0, info: 1 },
  ],
  errorsByModule: [{ module: 'transfer', errors: 3 }],
}
const dashboard = { summary, events: page }
const emptyDashboard = {
  summary: {
    ...summary,
    total: 0,
    errors: 0,
    warnings: 0,
    infos: 0,
    errorsByModule: [],
    series: summary.series.map((bucket) => ({ ...bucket, error: 0, warn: 0, info: 0 })),
  },
  events: {
    ...page,
    content: [],
    totalElements: 0,
    totalPages: 0,
    errors: 0,
    failuresByModule: [],
  },
}
afterEach(() => vi.unstubAllGlobals())

function setChartRange(from: string, to: string) {
  const draft = localDraft({ from, to })
  fireEvent.change(screen.getByLabelText('Início do intervalo do gráfico'), {
    target: { value: draft.from },
  })
  fireEvent.change(screen.getByLabelText('Fim do intervalo do gráfico'), {
    target: { value: draft.to },
  })
}

it('loads backend events, indicators, details and correlated events', async () => {
  const mock = vi
    .fn()
    .mockImplementation((url: string) =>
      Promise.resolve(
        new Response(JSON.stringify(url.includes(`events/${event.id}`) ? event : dashboard)),
      ),
    )
  vi.stubGlobal('fetch', mock)
  render(<Observability />)
  expect(screen.getByText('Carregando eventos...')).toBeInTheDocument()
  expect(await screen.findByText(event.action)).toBeInTheDocument()
  expect(
    within(screen.getByRole('region', { name: 'Módulos com mais erros' })).getByText('transfer'),
  ).toBeInTheDocument()
  expect(screen.getByText('Eventos filtrados').parentElement).toHaveTextContent('26')
  expect(screen.getByText('Erros (ERROR)').parentElement).toHaveTextContent('3')
  expect(screen.getByText('Avisos (WARN)').parentElement).toHaveTextContent('2')
  expect(screen.getByText('Informações (INFO)').parentElement).toHaveTextContent('21')
  expect(screen.getByText(/Última atualização:/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /Ver detalhes:/ }))
  const drawer = await screen.findByRole('dialog')
  expect(await within(drawer).findByText(event.correlationId)).toBeInTheDocument()
  expect(within(drawer).getByText(event.entityId)).toBeInTheDocument()
  expect(within(drawer).getByText(event.actorId)).toBeInTheDocument()
  await userEvent.click(
    within(drawer).getByRole('button', { name: 'Ver eventos desta correlação' }),
  )
  await waitFor(() =>
    expect(
      mock.mock.calls.some(([url]) => String(url).includes(`correlationId=${event.correlationId}`)),
    ).toBe(true),
  )
})

it('applies filters, ordering and server pagination', async () => {
  const mock = vi
    .fn()
    .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(dashboard))))
  vi.stubGlobal('fetch', mock)
  render(<Observability />)
  await screen.findByText(event.action)
  await userEvent.selectOptions(screen.getByLabelText('Severidade'), 'ERROR')
  fireEvent.change(screen.getByLabelText('Módulo'), { target: { value: 'transfer' } })
  fireEvent.change(screen.getByLabelText('Ação'), {
    target: { value: 'transfer.creation.completed' },
  })
  fireEvent.change(screen.getByLabelText('Resultado'), { target: { value: 'failure' } })
  await userEvent.selectOptions(screen.getByLabelText('Ordenação'), 'asc')
  await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
  await screen.findByText(event.action)
  const url = mock.mock.calls.at(-1)![0] as string
  expect(url).toContain('severity=ERROR')
  expect(url).toContain('module=transfer')
  expect(url).toContain('action=transfer.creation.completed')
  expect(url).toContain('outcome=failure')
  expect(url).toContain('order=asc')
  await userEvent.click(screen.getByRole('button', { name: 'Próxima' }))
  await waitFor(() => expect(mock.mock.calls.at(-1)![0]).toContain('page=1'))
})

it('shows empty data and allows retry after a loading error', async () => {
  const mock = vi
    .fn()
    .mockResolvedValueOnce(new Response('{}', { status: 500 }))
    .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(emptyDashboard))))
  vi.stubGlobal('fetch', mock)
  render(<Observability />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os eventos')
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(
    await screen.findByText('Nenhum evento encontrado para os filtros selecionados.'),
  ).toBeInTheDocument()
  expect(screen.getByText('Nenhum erro nos filtros selecionados.')).toBeInTheDocument()
  expect(screen.getByText('Nenhum evento no período selecionado.')).toBeInTheDocument()
})

it('toggles chart series and applies a selected point to the shared filters', async () => {
  const mock = vi
    .fn()
    .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(dashboard))))
  vi.stubGlobal('fetch', mock)
  const { container } = render(<Observability />)
  await screen.findByText(event.action)
  expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(3)
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Ver INFO' }))
  await screen.findByText(event.action)
  expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(1)
  expect(screen.getByLabelText('Gráfico de linhas de INFO')).toBeInTheDocument()
  expect(new URL(mock.mock.calls.at(-1)![0], 'http://localhost').searchParams.get('severity')).toBe(
    'INFO',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Ver INFO' }))
  await screen.findByText(event.action)
  expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(3)
  const point = screen.getByText(/^ERROR: 3/).parentElement!
  fireEvent.click(point)
  await waitFor(() => expect(mock).toHaveBeenCalledTimes(4))
  const query = new URL(mock.mock.calls.at(-1)![0], 'http://localhost').searchParams
  expect(query.get('from')).toBe('2026-11-16T11:00:00.000Z')
  expect(query.get('to')).toBe('2026-11-16T12:00:00.000Z')
  expect(query.get('severity')).toBe('ERROR')
  expect(screen.getByLabelText('Período')).toHaveValue('custom')
  expect(screen.getByLabelText('Severidade')).toHaveValue('ERROR')
})

it('keeps chart controls available after an empty selection and restores the previous filters on toggle', async () => {
  const mock = vi.fn().mockImplementation((url: string) => {
    const query = new URL(url, 'http://localhost').searchParams
    return Promise.resolve(
      new Response(JSON.stringify(query.get('severity') === 'ERROR' ? emptyDashboard : dashboard)),
    )
  })
  vi.stubGlobal('fetch', mock)
  const { container } = render(<Observability />)
  await screen.findByText(event.action)
  await userEvent.selectOptions(screen.getByLabelText('Severidade'), 'WARN')
  fireEvent.change(screen.getByLabelText('Módulo'), { target: { value: 'transfer' } })
  await userEvent.selectOptions(screen.getByLabelText('Ordenação'), 'asc')
  await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
  await screen.findByText(event.action)
  const originalQuery = new URL(mock.mock.calls.at(-1)![0], 'http://localhost').searchParams
  setChartRange(summary.series[1].from, summary.series[1].to)
  const toggle = screen.getByRole('button', { name: 'Ver ERROR' })

  await userEvent.click(toggle)

  expect(
    await screen.findByText('Nenhum evento encontrado para os filtros selecionados.'),
  ).toBeInTheDocument()
  expect(toggle).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Ver ERROR' })).toBe(toggle)
  expect(screen.getByLabelText('Início do intervalo do gráfico')).toHaveValue(
    localDraft(summary.series[1]).from.slice(0, 16),
  )
  expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(1)
  expect(screen.getByLabelText('Gráfico de linhas de ERROR')).toBeInTheDocument()
  expect(screen.getByText('Eventos filtrados').parentElement).toHaveTextContent('0')

  await userEvent.click(toggle)

  expect(await screen.findByText(event.action)).toBeInTheDocument()
  expect(toggle).toHaveAttribute('aria-pressed', 'false')
  expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(3)
  expect(new URL(mock.mock.calls.at(-1)![0], 'http://localhost').searchParams.toString()).toBe(
    originalQuery.toString(),
  )
  expect(screen.getByLabelText('Período')).toHaveValue('24h')
  expect(screen.getByLabelText('Severidade')).toHaveValue('WARN')
  expect(screen.getByLabelText('Módulo')).toHaveValue('transfer')
})

it('switches selected chart points and restores the original range rather than the previous point', async () => {
  const mock = vi
    .fn()
    .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(dashboard))))
  vi.stubGlobal('fetch', mock)
  render(<Observability />)
  await screen.findByText(event.action)
  const originalQuery = new URL(mock.mock.calls.at(-1)![0], 'http://localhost').searchParams
  await userEvent.click(screen.getByRole('button', { name: 'Ver ERROR' }))
  await screen.findByText(event.action)
  await userEvent.click(screen.getByRole('button', { name: 'Ver INFO' }))
  await screen.findByText(event.action)
  const point = screen.getByText(/^INFO: 1/).parentElement!

  fireEvent.click(point)

  await waitFor(() => expect(mock).toHaveBeenCalledTimes(4))
  expect(screen.getByLabelText('Início do intervalo do gráfico')).toHaveValue(
    localDraft(summary.series[1]).from.slice(0, 16),
  )
  expect(screen.getByRole('button', { name: 'Ver INFO' })).toHaveAttribute('aria-pressed', 'true')
  let query = new URL(mock.mock.calls.at(-1)![0], 'http://localhost').searchParams
  expect(query.get('from')).toBe('2026-11-16T12:00:00.000Z')
  expect(query.get('severity')).toBe('INFO')

  await userEvent.click(screen.getByRole('button', { name: 'Ver INFO' }))

  await waitFor(() => expect(mock).toHaveBeenCalledTimes(5))
  query = new URL(mock.mock.calls.at(-1)![0], 'http://localhost').searchParams
  expect(query.toString()).toBe(originalQuery.toString())
  expect(screen.getByRole('button', { name: 'Ver INFO' })).toHaveAttribute('aria-pressed', 'false')
})

it('keeps the chart mounted while loading and allows an unsuccessful selection to be toggled off', async () => {
  let rejectSelection: (error: Error) => void = () => {}
  const mock = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(dashboard)))
    .mockImplementationOnce(
      () =>
        new Promise<Response>((_, reject) => {
          rejectSelection = reject
        }),
    )
    .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(dashboard))))
  vi.stubGlobal('fetch', mock)
  render(<Observability />)
  await screen.findByText(event.action)
  const toggle = screen.getByRole('button', { name: 'Ver ERROR' })

  await userEvent.click(toggle)

  expect(screen.getByText('Carregando eventos...')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Ver ERROR' })).toBe(toggle)
  await act(async () => rejectSelection(new Error('Unavailable')))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os eventos')
  expect(toggle).toHaveAttribute('aria-pressed', 'true')

  await userEvent.click(toggle)

  expect(await screen.findByText(event.action)).toBeInTheDocument()
  expect(screen.getByLabelText('Período')).toHaveValue('24h')
  expect(screen.getByLabelText('Severidade')).toHaveValue('')
})

it('queries the timestamp range, updates metrics for each severity and reapplies an edited range before toggling off', async () => {
  const mock = vi.fn().mockImplementation((url: string) => {
    const query = new URL(url, 'http://localhost').searchParams
    const severity = query.get('severity')
    const count = severity === 'ERROR' ? 3 : severity === 'WARN' ? 2 : 21
    const filtered = {
      summary: {
        ...summary,
        from: query.get('from'),
        to: query.get('to'),
        total: count,
        errors: severity === 'ERROR' ? count : 0,
        warnings: severity === 'WARN' ? count : 0,
        infos: severity === 'INFO' ? count : 0,
        series: summary.series.map((bucket, index) => ({
          ...bucket,
          from: index === 0 ? query.get('from') : bucket.from,
          to: index === 1 ? query.get('to') : bucket.to,
          error: severity === 'ERROR' && index === 0 ? count : 0,
          warn: severity === 'WARN' && index === 0 ? count : 0,
          info: severity === 'INFO' && index === 0 ? count : 0,
        })),
        errorsByModule: severity === 'ERROR' ? summary.errorsByModule : [],
      },
      events: { ...page, totalElements: count, totalPages: 1, content: [{ ...event, severity }] },
    }
    return Promise.resolve(new Response(JSON.stringify(severity ? filtered : dashboard)))
  })
  vi.stubGlobal('fetch', mock)
  const { container } = render(<Observability />)
  await screen.findByText(event.action)
  const originalQuery = new URL(mock.mock.calls.at(-1)![0], 'http://localhost').searchParams
  const start = screen.getByLabelText('Início do intervalo do gráfico')
  const end = screen.getByLabelText('Fim do intervalo do gráfico')
  expect(start).toHaveAttribute('type', 'datetime-local')
  expect(end).toHaveAttribute('type', 'datetime-local')
  expect(start).toHaveValue(localDraft(summary).from.slice(0, 16))
  expect(end).toHaveValue(localDraft(summary).to.slice(0, 16))
  setChartRange('2026-11-16T11:15:30.123Z', '2026-11-16T12:45:40.456Z')
  expect(mock).toHaveBeenCalledTimes(1)

  for (const [severity, count] of [
    ['ERROR', 3],
    ['WARN', 2],
    ['INFO', 21],
  ] as const) {
    await userEvent.click(screen.getByRole('button', { name: `Ver ${severity}` }))
    await screen.findByText(event.action)
    const query = new URL(mock.mock.calls.at(-1)![0], 'http://localhost').searchParams
    expect(query.get('from')).toBe('2026-11-16T11:15:30.123Z')
    expect(query.get('to')).toBe('2026-11-16T12:45:40.456Z')
    expect(query.get('severity')).toBe(severity)
    expect(screen.getByText('Eventos filtrados').parentElement).toHaveTextContent(String(count))
    for (const candidate of ['ERROR', 'WARN', 'INFO']) {
      expect(screen.getByRole('button', { name: `Ver ${candidate}` })).toHaveAttribute(
        'aria-pressed',
        String(candidate === severity),
      )
    }
    expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(1)
    expect(screen.getByLabelText(`Gráfico de linhas de ${severity}`)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`^${severity}: ${count} —`))).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText(severity)).toBeInTheDocument()
  }

  setChartRange('2026-11-16T11:30:00Z', '2026-11-16T12:30:00Z')
  expect(screen.getByRole('button', { name: 'Ver INFO' })).toHaveAttribute('aria-pressed', 'true')
  await userEvent.click(screen.getByRole('button', { name: 'Ver INFO' }))
  await screen.findByText(event.action)
  expect(new URL(mock.mock.calls.at(-1)![0], 'http://localhost').searchParams.get('from')).toBe(
    '2026-11-16T11:30:00.000Z',
  )
  expect(screen.getByRole('button', { name: 'Ver INFO' })).toHaveAttribute('aria-pressed', 'true')

  await userEvent.click(screen.getByRole('button', { name: 'Ver INFO' }))
  await screen.findByText(event.action)
  expect(new URL(mock.mock.calls.at(-1)![0], 'http://localhost').searchParams.toString()).toBe(
    originalQuery.toString(),
  )
  expect(screen.getByText('Eventos filtrados').parentElement).toHaveTextContent('26')
  expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(3)
})

it('blocks empty, reversed and out-of-bounds chart intervals without requesting events', async () => {
  const mock = vi
    .fn()
    .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(dashboard))))
  vi.stubGlobal('fetch', mock)
  render(<Observability />)
  await screen.findByText(event.action)
  for (const [from, to] of [
    ['2026-11-16T12:00:00Z', '2026-11-16T12:00:00Z'],
    ['2026-11-16T12:30:00Z', '2026-11-16T11:30:00Z'],
    ['2026-11-16T10:59:00Z', summary.to],
    [summary.from, '2026-11-16T13:01:00Z'],
  ]) {
    setChartRange(from, to)
    expect(screen.getByRole('alert')).toHaveTextContent('intervalo crescente')
    for (const severity of ['ERROR', 'WARN', 'INFO']) {
      expect(screen.getByRole('button', { name: `Ver ${severity}` })).toBeDisabled()
    }
  }
  fireEvent.change(screen.getByLabelText('Início do intervalo do gráfico'), {
    target: { value: '' },
  })
  expect(screen.getByRole('button', { name: 'Ver ERROR' })).toBeDisabled()
  expect(mock).toHaveBeenCalledTimes(1)
  setChartRange(summary.from, summary.to)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Ver ERROR' })).toBeEnabled()
})

it('supports presets, custom range validation, accessible interval selection and refresh', async () => {
  const mock = vi
    .fn()
    .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(dashboard))))
  vi.stubGlobal('fetch', mock)
  render(<Observability />)
  await screen.findByText(event.action)
  await userEvent.selectOptions(screen.getByLabelText('Período'), '1h')
  await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
  await screen.findByText(event.action)
  let query = new URL(mock.mock.calls.at(-1)![0], 'http://localhost').searchParams
  expect(Date.parse(query.get('to')!) - Date.parse(query.get('from')!)).toBe(3_600_000)
  await userEvent.selectOptions(screen.getByLabelText('Período'), 'custom')
  fireEvent.change(screen.getByLabelText('De (horário local)'), {
    target: { value: '2026-01-01T00:00' },
  })
  fireEvent.change(screen.getByLabelText('Até (horário local)'), {
    target: { value: '2026-11-16T00:00' },
  })
  await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('até 90 dias')
  expect(mock).toHaveBeenCalledTimes(2)
  setChartRange(summary.series[1].from, summary.series[1].to)
  expect(mock).toHaveBeenCalledTimes(2)
  await userEvent.click(screen.getByRole('button', { name: 'Ver INFO' }))
  await screen.findByText(event.action)
  query = new URL(mock.mock.calls.at(-1)![0], 'http://localhost').searchParams
  expect(query.get('severity')).toBe('INFO')
  expect(query.get('from')).toBe('2026-11-16T12:00:00.000Z')
  const from = query.get('from')
  await userEvent.click(screen.getByRole('button', { name: 'Atualizar' }))
  await screen.findByText(event.action)
  expect(new URL(mock.mock.calls.at(-1)![0], 'http://localhost').searchParams.get('from')).toBe(
    from,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))
  await screen.findByText(event.action)
  expect(screen.getByLabelText('Período')).toHaveValue('24h')
  expect(screen.getByLabelText('Severidade')).toHaveValue('')
})

it('ignores an older response after the current filters have loaded', async () => {
  const pending: ((response: Response) => void)[] = []
  const mock = vi
    .fn()
    .mockImplementation(() => new Promise<Response>((resolve) => pending.push(resolve)))
  vi.stubGlobal('fetch', mock)
  render(<Observability />)
  await userEvent.selectOptions(screen.getByLabelText('Severidade'), 'WARN')
  await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
  await waitFor(() => expect(pending).toHaveLength(2))
  await act(async () => pending[1](new Response(JSON.stringify(emptyDashboard))))
  expect(await screen.findByText('Nenhum evento no período selecionado.')).toBeInTheDocument()
  await act(async () => pending[0](new Response(JSON.stringify(dashboard))))
  expect(screen.queryByText(event.action)).not.toBeInTheDocument()
  expect(screen.getByText('Eventos filtrados').parentElement).toHaveTextContent('0')
})
