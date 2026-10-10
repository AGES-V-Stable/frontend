import { ApiError } from './registration'

const API_URL = '/v1/users'

export interface User {
  id: string
  name: string
  email: string
  companyId: string
}

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getCurrentUser(signal?: AbortSignal): Promise<User> {
  const headers = getHeaders()
  const response = await fetch(`${API_URL}/me`, {
    signal,
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  })

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token')
      throw new ApiError(401, 'Não autenticado')
    }
    let message = 'Não foi possível carregar os dados do usuário'
    try {
      const err = await response.json()
      if (err.message) message = err.message
    } catch {
      // ignore
    }
    throw new ApiError(response.status, message)
  }

  return response.json()
}
