import { apiFetch, ApiError } from './api'

interface LoginData {
  email: string
  password: string
}

interface LoginResponse {
  token: string
}

export const LOGIN_ERRORS = {
  INVALID_CREDENTIALS: 'E-mail ou senha inválidos',
  LOCKED: 'Usuário bloqueado. Entre em contato com o suporte.',
  UNAVAILABLE: 'Não foi possível entrar agora. Tente novamente em instantes.',
  MISSING_TOKEN: 'Token não retornado pelo servidor',
} as const

/**
 * POST /v1/auth/login. O backend devolve o JWT no header Authorization
 * ("Bearer <token>") e nenhum corpo JSON. Rota pública: nunca envia um token
 * antigo que esteja salvo.
 */
async function login(data: LoginData): Promise<LoginResponse> {
  let response: Response
  try {
    response = await apiFetch('/auth/login', {
      method: 'POST',
      authenticated: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email.trim(), password: data.password }),
    })
  } catch {
    throw new ApiError(0, LOGIN_ERRORS.UNAVAILABLE, { code: 'NETWORK_ERROR' })
  }

  if (response.status === 401) {
    throw new ApiError(401, LOGIN_ERRORS.INVALID_CREDENTIALS, { code: 'INVALID_CREDENTIALS' })
  }

  if (response.status === 423) {
    throw new ApiError(423, LOGIN_ERRORS.LOCKED, { code: 'ACCOUNT_LOCKED' })
  }

  if (!response.ok) {
    throw new ApiError(response.status, LOGIN_ERRORS.UNAVAILABLE)
  }

  const authorization = response.headers.get('Authorization')

  if (!authorization) {
    throw new ApiError(response.status, LOGIN_ERRORS.MISSING_TOKEN)
  }

  // Handles "Bearer <token>"
  const token = authorization.startsWith('Bearer ') ? authorization.substring(7) : authorization

  return { token }
}

export const authService = {
  login,
}
