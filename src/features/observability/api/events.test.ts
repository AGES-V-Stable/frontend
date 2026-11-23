import { afterEach, expect, it, vi } from 'vitest'
import { eventSchema, getEvents, getEvent, getDashboard, type EventFilters } from './events'
const filters: EventFilters = {
  from: '',
  to: '',
  severity: '',
  module: '',
  action: '',
  outcome: '',
  correlationId: '',
  order: 'desc',
}
it('accepts canonical UUIDs supported by the backend even without an RFC version or variant', () => {
  const id = '11111111-1111-1111-1111-111111111111'
  expect(
    eventSchema.parse({
      id,
      occurredAt: '2026-11-16T12:00:00Z',
      severity: 'INFO',
      module: 'http',
      action: 'http.request.completed',
      actorId: null,
      entityType: null,
      entityId: null,
      outcome: 'success',
      failed: false,
      durationMs: 1,
      message: 'Application event: http.request.completed',
      correlationId: id,
      source: 'backend',
      metadata: {},
    }).correlationId,
  ).toBe(id)
})
afterEach(() => vi.unstubAllGlobals())
it('serializes local dates as UTC and validates paginated API data', async () => {
  const mock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        content: [],
        page: 0,
        size: 25,
        totalElements: 0,
        totalPages: 0,
        errors: 0,
        failuresByModule: [],
      }),
    ),
  )
  vi.stubGlobal('fetch', mock)
  const from = '2026-11-16T10:00'
  await getEvents({ ...filters, from, module: ' company ' }, 0, new AbortController().signal)
  const url = new URL(mock.mock.calls[0][0], 'http://localhost')
  expect(url.searchParams.get('from')).toBe(new Date(from).toISOString())
  expect(url.searchParams.get('module')).toBe('company')
})
it('rejects malformed list and detail responses', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => Promise.resolve(new Response('{}'))),
  )
  await expect(getEvents(filters, 0, new AbortController().signal)).rejects.toThrow()
  await expect(getEvent('bad-id', new AbortController().signal)).rejects.toThrow()
  await expect(getDashboard(filters, 0, new AbortController().signal)).rejects.toThrow()
})

it('requests a validated dashboard with the exact same filters for aggregates and logs', async () => {
  const events = {
    content: [],
    page: 0,
    size: 25,
    totalElements: 0,
    totalPages: 0,
    errors: 0,
    failuresByModule: [],
  }
  const summary = {
    from: '2026-11-16T12:00:00Z',
    to: '2026-11-16T13:00:00Z',
    generatedAt: '2026-11-16T13:00:00Z',
    interval: 'minute',
    total: 0,
    errors: 0,
    warnings: 0,
    infos: 0,
    series: [],
    errorsByModule: [],
  }
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ summary, events })))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ summary: { ...summary, total: 99 }, events })),
    )
  vi.stubGlobal('fetch', fetch)
  const signal = new AbortController().signal
  const result = await getDashboard(
    { ...filters, from: summary.from, to: summary.to, severity: 'ERROR', module: 'transfer' },
    2,
    signal,
  )
  expect(result.summary.total).toBe(0)
  const url = new URL(fetch.mock.calls[0][0], 'http://localhost')
  expect(url.pathname).toBe('/v1/admin/observability/events/dashboard')
  expect(url.searchParams.get('page')).toBe('2')
  expect(url.searchParams.get('severity')).toBe('ERROR')
  expect(url.searchParams.get('module')).toBe('transfer')
  expect(fetch.mock.calls[0][1].signal).toBe(signal)
  await expect(getDashboard(filters, 0, signal)).rejects.toThrow(
    'Inconsistent observability totals',
  )
})
