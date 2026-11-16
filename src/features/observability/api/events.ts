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
export async function getEvents(filters: EventFilters, page: number, signal: AbortSignal) {
  const query = new URLSearchParams({ page: String(page), size: '25', order: filters.order })
  for (const [key, value] of Object.entries(filters)) {
    if (value.trim())
      query.set(key, key === 'from' || key === 'to' ? new Date(value).toISOString() : value.trim())
  }
  return pageSchema.parse(await httpRequest<unknown>(`${base}?${query}`, { signal }))
}
export async function getEvent(id: string, signal: AbortSignal) {
  return eventSchema.parse(
    await httpRequest<unknown>(`${base}/${encodeURIComponent(id)}`, { signal }),
  )
}
