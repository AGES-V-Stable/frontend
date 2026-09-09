import { mockClients, type Cliente } from '@/data/mockClients'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

const normalizeClients = (payload: unknown): Cliente[] => {
  if (Array.isArray(payload)) return payload as Cliente[]

  if (typeof payload === 'object' && payload !== null) {
    const maybeData = payload as {
      data?: unknown
      results?: unknown
    }

    if (Array.isArray(maybeData.data)) return maybeData.data as Cliente[]
    if (Array.isArray(maybeData.results)) return maybeData.results as Cliente[]
  }

  return []
}

export const getClients = async (): Promise<Cliente[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/clients`, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`)
    }

    const payload = await response.json()
    const clients = normalizeClients(payload)

    return clients.length > 0 ? clients : mockClients
  } catch {
    return mockClients
  }
}
