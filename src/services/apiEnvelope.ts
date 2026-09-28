export function normalizeListResponse<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]

  if (typeof payload === 'object' && payload !== null) {
    const maybeData = payload as { data?: unknown; results?: unknown }

    if (Array.isArray(maybeData.data)) return maybeData.data as T[]
    if (Array.isArray(maybeData.results)) return maybeData.results as T[]
  }

  return []
}
