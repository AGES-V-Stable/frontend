import type { Beneficiary, PaginatedBeneficiaries } from '@/types/beneficiary'
import { ApiError } from './registration'

const API_URL = '/v1'

export interface BeneficiaryCreatePayload {
  beneficiaryType: string
  legalName: string
  identificationDocument: string
  country: string
  address: string
  confirmed: boolean
  receivingMethod: 'BANK_ACCOUNT' | 'CRYPTO_WALLET' | 'PIX_KEY'
  bankName?: string
  swiftBic?: string
  accountNumber?: string
  currency?: string
  nickname?: string
  walletAddress?: string
  blockchainNetwork?: string
}

export interface GetBeneficiariesParams {
  page?: number
  size?: number
  search?: string
  country?: string
  document?: string
  companyId?: string
}

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function createBeneficiary(
  companyId: string,
  payload: BeneficiaryCreatePayload,
): Promise<{ id: string }> {
  const encodedCompanyId = encodeURIComponent(companyId)
  const response = await fetch(`${API_URL}/companies/${encodedCompanyId}/beneficiaries`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let message = 'Falha ao cadastrar beneficiário'
    try {
      const errData = await response.json()
      if (errData.message) message = errData.message
    } catch {
      // ignore
    }
    throw new ApiError(response.status, message)
  }

  return response.json()
}

export async function getBeneficiaries(
  params: GetBeneficiariesParams = {},
): Promise<PaginatedBeneficiaries> {
  const searchParams = new URLSearchParams()
  const page = params.page !== undefined ? Math.max(0, params.page - 1) : 0
  const size = params.size ?? 20

  searchParams.append('page', String(page))
  searchParams.append('size', String(size))

  if (params.search) searchParams.append('search', params.search)
  if (params.document) searchParams.append('document', params.document)
  if (params.country) searchParams.append('country', params.country)

  const endpoint = params.companyId
    ? `${API_URL}/companies/${encodeURIComponent(params.companyId)}/beneficiaries`
    : `${API_URL}/beneficiaries`

  const response = await fetch(`${endpoint}?${searchParams.toString()}`, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new ApiError(response.status, `Request failed with status ${response.status}`)
  }

  const data = await response.json()

  // Suporta respostas envelopadas { data: [...] } ou diretas do Spring Page { content: [...] }
  if (data.data && Array.isArray(data.data)) {
    return {
      content: data.data,
      totalElements: data.totalElements ?? data.data.length,
      totalPages: data.totalPages ?? 1,
      number: page,
      size,
    }
  }

  return {
    content: data.content ?? [],
    totalElements: data.totalElements ?? 0,
    totalPages: data.totalPages ?? 1,
    number: data.number ?? page,
    size: data.size ?? size,
  }
}

export async function getBeneficiary(id: string, companyId?: string): Promise<Beneficiary> {
  const endpoint = companyId
    ? `${API_URL}/companies/${encodeURIComponent(companyId)}/beneficiaries/${encodeURIComponent(id)}`
    : `${API_URL}/beneficiaries/${encodeURIComponent(id)}`

  const response = await fetch(endpoint, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new ApiError(response.status, `Request failed with status ${response.status}`)
  }

  const data = await response.json()
  return data.data ? data.data : data
}