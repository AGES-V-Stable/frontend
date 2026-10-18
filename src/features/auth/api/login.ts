import type { LoginFormData } from '../schemas/auth'
import { z } from 'zod'
import { ApiError, httpResponse } from '@/shared/http/httpClient'

export const authService = {
  async login(credentials: LoginFormData): Promise<{ token: string }> {
    let response: Response
    try {
      response = await httpResponse(
        '/v1/auth/login',
        { method: 'POST', body: JSON.stringify(credentials) },
        false,
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 423)
        throw new ApiError(423, 'Usuário bloqueado', error.code)
      if (error instanceof ApiError && error.status === 401)
        throw new ApiError(401, 'E-mail ou senha inválidos', error.code)
      throw error
    }
    const header = response.headers
      .get('Authorization')
      ?.replace(/^Bearer\s+/i, '')
      .trim()
    if (header) return { token: header }
    const data = await response.json().catch(() => null)
    const parsed = z
      .object({ token: z.string().min(1).optional(), accessToken: z.string().min(1).optional() })
      .safeParse(data)
    const token = parsed.success ? (parsed.data.token ?? parsed.data.accessToken) : null
    if (!token) throw new Error('Token não encontrado na resposta')
    return { token }
  },
}
