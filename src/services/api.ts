import { getApiOrigin } from '@/schemas/env'

import { clearSession, getAccessToken } from './authToken'

/**
 * Cliente HTTP único da aplicação: monta a URL (origem configurável + exatamente
 * um "/v1"), anexa o token da sessão nas rotas protegidas, trata respostas
 * vazias e converte erros no mesmo formato ({ status, code, message }).
 *
 * Uploads diretos para URLs pré-assinadas do storage NÃO passam por aqui — elas
 * não podem receber o token da aplicação.
 */

export const API_VERSION_PREFIX = '/v1'
export const GENERIC_ERROR_MESSAGE = 'Não foi possível concluir a solicitação. Tente novamente.'
/** Disparado quando uma rota protegida responde 401: a sessão foi encerrada. */
export const UNAUTHORIZED_EVENT = 'vstable:unauthorized'

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly body?: unknown

  constructor(status: number, message: string, options: { code?: string; body?: unknown } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = options.code
    this.body = options.body
  }
}

/** `path` é relativo a /v1, ex.: "/users/me". */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${getApiOrigin()}${API_VERSION_PREFIX}${normalized}`
}

export interface ApiRequestOptions extends RequestInit {
  /** false = rota pública (login, onboarding): nunca envia um token antigo. */
  authenticated?: boolean
}

export async function apiFetch(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  const { authenticated = true, headers, ...init } = options
  const token = authenticated ? getAccessToken() : null

  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string> | undefined),
    },
  })

  if (response.status === 401 && token) {
    handleUnauthorized()
  }

  return response
}

/** Faz a requisição e devolve o JSON (ou undefined para 204/corpo vazio); lança ApiError se !ok. */
export async function apiJson<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await apiFetch(path, options)
  if (!response.ok) throw await toApiError(response)
  return (await readBody(response)) as T
}

/** JSON helper com corpo serializado e Content-Type. */
export function jsonBody(body: unknown): Pick<RequestInit, 'body' | 'headers'> {
  return { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }
}

export async function toApiError(response: Response, fallbackMessage = GENERIC_ERROR_MESSAGE) {
  const body = await readBody(response).catch(() => undefined)
  const payload = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
  return new ApiError(
    response.status,
    typeof payload.message === 'string' && payload.message ? payload.message : fallbackMessage,
    { code: typeof payload.code === 'string' ? payload.code : undefined, body },
  )
}

/** Lê o corpo tolerando 204, corpo vazio e texto não-JSON. */
async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined

  if (typeof response.text === 'function') {
    const text = await response.text()
    if (!text) return undefined
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
  return typeof response.json === 'function' ? response.json() : undefined
}

function handleUnauthorized(): void {
  clearSession()
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
}
