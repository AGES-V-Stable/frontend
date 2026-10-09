import type { Beneficiary, PaginatedBeneficiaries } from '@/types/beneficiary'

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

function getHeaders() {
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
  const response = await fetch(`${API_URL}/companies/${companyId}/beneficiaries`, {
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
    throw new Error(message)
  }

  return response.json()
}

interface GetBeneficiariesParams {
  page: number
  size: number
  search?: string
  country?: string
  document?: string
  companyId?: string
}

export async function getBeneficiaries(params: GetBeneficiariesParams): Promise<PaginatedBeneficiaries> {
  const searchParams = new URLSearchParams()
  searchParams.append('page', String(Math.max(0, params.page - 1))) 
  searchParams.append('size', String(params.size))
  
  if (params.search) searchParams.append('search', params.search)
  if (params.country) searchParams.append('country', params.country)
  if (params.document) searchParams.append('document', params.document)
  if (params.companyId) searchParams.append('companyId', params.companyId)

  const response = await fetch(`${API_URL}/beneficiaries?${searchParams.toString()}`, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error('Falha ao buscar beneficiários')
  }

  return response.json()
}

export async function getBeneficiary(id: string): Promise<Beneficiary> {
  const response = await fetch(`${API_URL}/beneficiaries/${id}`, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error('Falha ao buscar detalhes do beneficiário')
  }

  return response.json()
}