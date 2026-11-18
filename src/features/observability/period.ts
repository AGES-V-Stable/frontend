import type { EventFilters } from './api/events'

export type Period = '1h' | '24h' | '7d' | 'custom'
export const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
export const formatDate = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { timeZone: timezone })

export function periodRange(period: Exclude<Period, 'custom'>, now = new Date()) {
  const hours = { '1h': 1, '24h': 24, '7d': 168 }[period]
  return { from: new Date(now.getTime() - hours * 3_600_000).toISOString(), to: now.toISOString() }
}

export function localDraft<T extends Pick<EventFilters, 'from' | 'to'>>(filters: T): T {
  const local = (value: string) => {
    const date = new Date(value)
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 23)
  }
  return { ...filters, from: local(filters.from), to: local(filters.to) }
}

export function resolveFilters(draft: EventFilters, period: Period): EventFilters {
  const range =
    period === 'custom'
      ? { from: new Date(draft.from).toISOString(), to: new Date(draft.to).toISOString() }
      : periodRange(period)
  const duration = Date.parse(range.to) - Date.parse(range.from)
  if (duration <= 0 || duration > 90 * 86_400_000)
    throw new Error('Selecione um intervalo crescente de até 90 dias.')
  return { ...draft, ...range }
}
