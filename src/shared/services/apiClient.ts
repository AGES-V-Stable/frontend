import { clearStoredToken } from './session'

const API_BASE = '/v1'

export class ApiError extends Error {
  public status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, options)
  if (!response.ok) {
    // Sessão expirada ou inválida: descarta o token para não manter o role de um JWT vencido.
    if (response.status === 401) clearStoredToken()
    const body = await response.json().catch(() => null)
    throw new ApiError(
      response.status,
      typeof body?.message === 'string'
        ? body.message
        : 'Não foi possível concluir a solicitação. Tente novamente.',
    )
  }
  return response.json() as Promise<T>
}
