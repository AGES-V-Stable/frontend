import type { LoginFormData } from '../schemas/auth'
import { z } from 'zod'
import { ApiError, httpResponse } from '@/shared/http/httpClient'

/** Login direto (token) ou desafio de segundo fator, conforme o contrato de POST /v1/auth/login. */
export interface LoginResult {
  token?: string
  requires2fa?: boolean
  challengeToken?: string
  otpauthUri?: string
}

export interface Verify2faParams {
  challengeToken: string
  code: string
}

export interface Verify2faResult {
  token: string
}

export const authService = {
  async login(credentials: LoginFormData): Promise<LoginResult> {
    let response: Response
    try {
      response = await httpResponse(
        '/v1/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email: credentials.email, password: credentials.password }),
        },
        false,
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 423)
        throw new ApiError(423, 'Usuário bloqueado', error.code)
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError(401, 'E-mail ou senha inválidos', error.code)
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
        requires2fa: z.boolean().optional(),
        challengeToken: z.string().optional(),
        otpauthUri: z.string().optional(),
      })
      .safeParse(data)

    if (parsed.success) {
      if (parsed.data.requires2fa) {
        return {
          requires2fa: true,
          challengeToken: parsed.data.challengeToken,
          otpauthUri: parsed.data.otpauthUri,
        }
      }
      const token = parsed.data.token ?? parsed.data.accessToken
      if (token) return { token }
    }

    throw new Error('Token não encontrado na resposta')
  },

  async verify2fa(params: Verify2faParams): Promise<Verify2faResult> {
    let response: Response
    try {
      response = await httpResponse(
        '/v1/auth/login/verify-2fa',
        {
          method: 'POST',
          body: JSON.stringify({ challengeToken: params.challengeToken, code: params.code }),
        },
        false,
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 423)
        throw new ApiError(423, 'Usuário bloqueado', error.code)
      if (error instanceof ApiError && error.status === 410)
        throw new ApiError(410, 'Sessão expirada. Faça login novamente.', error.code)
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError(401, 'Código de autenticação inválido ou expirado.', error.code)
      }
      throw error
    }

    const header = response.headers
      .get('authorization')
      ?.replace(/^Bearer\s+/i, '')
      .trim()
    if (header) return { token: header }

    const data = await response.json().catch(() => null)
    const parsed = z
      .object({
        token: z.string().min(1).optional(),
        accessToken: z.string().min(1).optional(),
      })
      .safeParse(data)

    if (parsed.success) {
      const token = parsed.data.token ?? parsed.data.accessToken
      if (token) return { token }
    }

    throw new Error('Token não encontrado na resposta')
  },
}
