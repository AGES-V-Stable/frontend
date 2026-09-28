import type { Beneficiary, PaginatedBeneficiaries } from '@/types/beneficiary'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

const authHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export interface GetBeneficiariesParams {
  page?: number
  size?: number
  companyId?: string
  search?: string
  document?: string
  country?: string
}

export const getBeneficiaries = async (
  params: GetBeneficiariesParams = {},
): Promise<PaginatedBeneficiaries> => {
  const queryParams = new URLSearchParams()

  // O backend Spring espera page em base 0, o front envia em base 1.
  queryParams.append('page', String((params.page || 1) - 1))
  queryParams.append('size', String(params.size || 10))

  if (params.companyId) queryParams.append('companyId', params.companyId)
  if (params.search) queryParams.append('search', params.search)
  if (params.document) queryParams.append('document', params.document)
  if (params.country) queryParams.append('country', params.country)

  const response = await fetch(`${API_BASE_URL}/v1/beneficiaries?${queryParams.toString()}`, {
    headers: authHeaders(),
  })

  if (!response.ok) throw new Error(`Request failed with status ${response.status}`)

  return response.json() as Promise<PaginatedBeneficiaries>
}

export const getBeneficiary = async (id: string): Promise<Beneficiary> => {
  const response = await fetch(`${API_BASE_URL}/v1/beneficiaries/${encodeURIComponent(id)}`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`)

  const payload: unknown = await response.json()
  // Trata possível wrapper se a API envelopar, caso contrário pega direto
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    const data = (payload as { data?: unknown }).data
    if (data && typeof data === 'object') return data as Beneficiary
  }

  return payload as Beneficiary
}
