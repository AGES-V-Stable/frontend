import type { LoginFormData } from '@/schemas/auth'
import { ApiError } from './registration'

// Usa a rota base padrão do seu projeto
const API_URL = 'http://localhost:8080/v1'

export const authService = {
  async login(credentials: LoginFormData): Promise<{ token: string }> {
    // Usa a rota correta especificada por você
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      if (response.status === 423) {
        throw new ApiError(423, 'Usuário bloqueado')
      }
      throw new ApiError(response.status, 'E-mail ou senha inválidos')
    }

    const authHeader = response.headers.get('Authorization')
    if (authHeader) {
      return { token: authHeader.replace(/^Bearer\s+/i, '').trim() }
    }

    try {
      const data = await response.json()
      if (data.token) return { token: data.token }
      if (data.accessToken) return { token: data.accessToken }
    } catch {
      // response body is empty
    }

    throw new Error('Token não encontrado na resposta')
  },
}