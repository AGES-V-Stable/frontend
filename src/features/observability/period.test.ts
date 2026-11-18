import { expect, it } from 'vitest'
import { localDraft, periodRange, resolveFilters } from './period'
import type { EventFilters } from './api/events'

const filters: EventFilters = {
  ...periodRange('24h'),
  severity: '',
  module: '',
  action: '',
  outcome: '',
  correlationId: '',
  order: 'desc',
}

it('resolves exact UTC preset durations with a fixed upper bound', () => {
  const now = new Date('2026-11-16T12:34:56.123Z')
  for (const [period, hours] of [
    ['1h', 1],
    ['24h', 24],
    ['7d', 168],
  ] as const) {
    const range = periodRange(period, now)
    expect(range.to).toBe(now.toISOString())
    expect(Date.parse(range.to) - Date.parse(range.from)).toBe(hours * 3_600_000)
  }
})

it('round trips local form values without dropping milliseconds and rejects invalid ranges', () => {
  const draft = localDraft(filters)
  expect(resolveFilters(draft, 'custom')).toEqual(filters)
  for (const range of [
    { from: '2026-11-16T12:00', to: '2026-11-16T11:00' },
    { from: '2026-01-01T00:00', to: '2026-11-16T00:00' },
    { from: '', to: '' },
  ]) {
    expect(() => resolveFilters({ ...draft, ...range }, 'custom')).toThrow()
  }
})
