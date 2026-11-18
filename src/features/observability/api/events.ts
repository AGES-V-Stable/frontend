import { z } from 'zod'
import { httpRequest } from '@/shared/http/httpClient'

// Java UUID accepts canonical UUID text without imposing an RFC version/variant.
const uuidText = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

export const eventSchema = z.object({
  id: uuidText,
  occurredAt: z.iso.datetime(),
  severity: z.enum(['INFO', 'WARN', 'ERROR']),
  module: z.string(),
  action: z.string(),
  actorId: uuidText.nullable(),
  entityType: z.string().nullable(),
  entityId: uuidText.nullable(),
  outcome: z.string(),
  failed: z.boolean(),
  durationMs: z.number().nonnegative().nullable(),
  message: z.string(),
  correlationId: uuidText.nullable(),
  source: z.enum(['backend', 'browser']),
  metadata: z.record(z.string(), z.unknown()),
})
const pageSchema = z.object({
  content: z.array(eventSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  failuresByModule: z.array(z.object({ module: z.string(), failures: z.number().nonnegative() })),
})
export type ObservabilityEvent = z.infer<typeof eventSchema>
export type EventPage = z.infer<typeof pageSchema>
const count = z.number().int().nonnegative()
export const summarySchema = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  interval: z.enum(['minute', 'hour', 'day']),
  generatedAt: z.iso.datetime(),
  total: count,
  errors: count,
  warnings: count,
  infos: count,
  series: z.array(
    z.object({
      from: z.iso.datetime(),
      to: z.iso.datetime(),
      error: count,
      warn: count,
      info: count,
    }),
  ),
  errorsByModule: z.array(z.object({ module: z.string(), errors: count })),
})
const dashboardSchema = z
  .object({ summary: summarySchema, events: pageSchema })
  .refine(
    ({ summary, events }) =>
      summary.total === events.totalElements &&
      summary.total === summary.errors + summary.warnings + summary.infos,
    'Inconsistent observability totals',
  )
export type EventSummary = z.infer<typeof summarySchema>
export type EventDashboard = z.infer<typeof dashboardSchema>
export type EventBucket = EventSummary['series'][number]
export type Severity = ObservabilityEvent['severity']
export type EventFilters = {
  from: string
  to: string
  severity: string
  module: string
  action: string
  outcome: string
  correlationId: string
  order: string
}
const base = '/v1/admin/observability/events'
function queryFilters(filters: EventFilters, page: number) {
  const query = new URLSearchParams({ page: String(page), size: '25', order: filters.order })
  for (const [key, value] of Object.entries(filters)) {
    if (value.trim())
      query.set(key, key === 'from' || key === 'to' ? new Date(value).toISOString() : value.trim())
  }
  return query
}
export async function getEvents(filters: EventFilters, page: number, signal: AbortSignal) {
  return pageSchema.parse(
    await httpRequest<unknown>(`${base}?${queryFilters(filters, page)}`, { signal }),
  )
}
export async function getDashboard(filters: EventFilters, page: number, signal: AbortSignal) {
  return dashboardSchema.parse(
    await httpRequest<unknown>(`${base}/dashboard?${queryFilters(filters, page)}`, { signal }),
  )
}
export async function getEvent(id: string, signal: AbortSignal) {
  return eventSchema.parse(
    await httpRequest<unknown>(`${base}/${encodeURIComponent(id)}`, { signal }),
  )
}
