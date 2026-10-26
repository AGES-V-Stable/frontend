import { env } from '@/shared/schemas/env'
import { getAccessToken, getLoginToken, invalidateToken } from './authToken'

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly body?: unknown
  constructor(status: number, message: string, code?: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.body = body
  }
}

export class HttpError extends ApiError {
  constructor(message: string, status: number, body?: unknown, code?: string) {
    super(status, message, code, body)
    this.name = 'HttpError'
  }
}

export function apiUrl(path: string): string {
  return `${env.VITE_API_URL}${path}`
}

/** Transport only: feature adapters validate the returned bodies. */
export async function httpResponse(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<Response> {
  const token = authenticated
    ? path.startsWith('/v1/onboarding')
      ? getAccessToken()
      : (getLoginToken() ?? getAccessToken())
    : null
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      headers: Object.fromEntries(
        Array.from(headers, ([key, value]) => [
          (
            {
              authorization: 'Authorization',
              'content-type': 'Content-Type',
              accept: 'Accept',
            } as Record<string, string>
          )[key] ?? key,
          value,
        ]),
      ),
    })
  } catch (error) {
    if (
      options.signal?.aborted ||
      ((error instanceof Error || error instanceof DOMException) && error.name === 'AbortError')
    )
      throw error
    throw new HttpError('Não foi possível conectar ao servidor.', 0, undefined, 'NETWORK_ERROR')
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let body: unknown = text
    try {
      body = JSON.parse(text)
    } catch {
      /* plain HTTP error */
    }
    const record =
      typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
    if (response.status === 401 && token) invalidateToken(token)
    throw new HttpError(
      typeof record.message === 'string'
        ? record.message
        : 'Não foi possível concluir a solicitação. Tente novamente.',
      response.status,
      body,
      typeof record.code === 'string' ? record.code : undefined,
    )
  }
  return response
}

export async function httpRequest<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const response = await httpResponse(path, options, authenticated)
  if (response.status === 204) return undefined as T
  const text = await response.text()
  if (!text.trim()) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new HttpError(
      'Formato inválido retornado pela API',
      response.status,
      undefined,
      'INVALID_RESPONSE',
    )
  }
}
