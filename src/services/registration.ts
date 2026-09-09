import type {
  CompanyData,
  CompanyRegistrationResult,
  RegistrationProgress,
} from '@/types/registration'

const API_BASE = '/v1'
export class ApiError extends Error {
  public status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, options)
  if (!response.ok) {
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
export function getRegistration(id: string, signal?: AbortSignal) {
  return request<RegistrationProgress>(`/cadastros/${encodeURIComponent(id)}`, { signal })
}
export function saveCompany(id: string, data: CompanyData) {
  return request<CompanyRegistrationResult>(`/cadastros/${encodeURIComponent(id)}/empresa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razao_social: data.razaoSocial.trim(),
      pais: data.pais.trim(),
      cnpj: data.cnpj.replace(/\D/g, ''),
      cep:
        data.pais.trim().toLowerCase() === 'brasil' ? data.cep.replace(/\D/g, '') : data.cep.trim(),
      cidade: data.cidade.trim() || null,
      estado: data.estado.trim(),
    }),
  })
}
