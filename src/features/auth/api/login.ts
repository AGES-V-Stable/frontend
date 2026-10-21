import type { LoginFormData } from '../schemas/auth'
import { z } from 'zod'
import { ApiError, httpResponse } from '@/shared/http/httpClient'

export interface LoginParams extends LoginFormData {
  totpCode?: string
  tempToken?: string
}

export interface LoginResult {
  token?: string
  twoFactorRequired?: boolean
  tempToken?: string
}

export const authService = {
  async login(credentials: LoginParams): Promise<LoginResult> {
    let response: Response
    try {
      response = await httpResponse(
        '/v1/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
            ...(credentials.totpCode
              ? { totpCode: credentials.totpCode, code: credentials.totpCode }
              : {}),
            ...(credentials.tempToken ? { tempToken: credentials.tempToken } : {}),
          }),
        },
        false,
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 423)
        throw new ApiError(423, 'Usuário bloqueado', error.code)
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError(
          401,
          credentials.totpCode
            ? 'Código de autenticação inválido ou expirado'
            : 'E-mail ou senha inválidos',
          error.code,
        )
      }
      throw error
    }

    const header = response.headers
      .get('Authorization')
      ?.replace(/^Bearer\s+/i, '')
      .trim()
    if (header) return { token: header }

    const data = await response.json().catch(() => null)
    const parsed = z
      .object({
        token: z.string().min(1).optional(),
        accessToken: z.string().min(1).optional(),
        twoFactorRequired: z.boolean().optional(),
        tempToken: z.string().optional(),
      })
      .safeParse(data)

    if (parsed.success) {
      if (parsed.data.twoFactorRequired) {
        return {
          twoFactorRequired: true,
          tempToken: parsed.data.tempToken,
        }
      }
      const token = parsed.data.token ?? parsed.data.accessToken
      if (token) return { token }
    }

    throw new Error('Token não encontrado na resposta')
  },
}
