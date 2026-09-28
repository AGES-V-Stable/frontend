import { mockClients, type Cliente } from '@/data/mockClients'
import { normalizeListResponse } from './apiEnvelope'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

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
    const clients = normalizeListResponse<Cliente>(payload)

    return clients.length > 0 ? clients : mockClients
  } catch {
    return mockClients
  }
}
