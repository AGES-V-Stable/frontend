import type {
  AccessData,
  CompanyData,
  CompanyRegistrationResult,
  ComplianceSubmissionResult,
  RegistrationProgress,
} from '@/types/registration'
import type { ComplianceFormData } from '@/types/compliance'

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

export function createRegistration(data: AccessData, idempotencyKey = crypto.randomUUID()) {
  return request<RegistrationProgress>('/cadastros/representante/acesso', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      nomeCompleto: data.nomeCompleto.trim(),
      email: data.email.trim().toLowerCase(),
      senha: data.senha,
      confirmarSenha: data.confirmarSenha,
    }),
  })
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

export function submitCompliance(id: string, data: ComplianceFormData) {
  const body = new FormData()
  body.append('tipo_documento', data.tipoDocumento)
  data.documentos.forEach(({ file }) => body.append('documentos', file))
  return request<ComplianceSubmissionResult>(`/cadastros/${encodeURIComponent(id)}/compliance`, {
    method: 'POST',
    body,
  })
}
