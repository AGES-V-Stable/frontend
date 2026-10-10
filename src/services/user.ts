import { ApiError } from './registration'

const API_URL = 'http://localhost:8080/v1/users'

export interface User {
  id: string
  name: string
  email: string
  companyId: string
}

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function getCurrentUser(signal?: AbortSignal): Promise<User> {
  const response = await fetch(`${API_URL}/me`, {
    signal,
    headers: getHeaders(),
  })

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token')
    }
    throw new ApiError(response.status, 'Não foi possível carregar os dados do usuário')
  }

  return response.json()
}