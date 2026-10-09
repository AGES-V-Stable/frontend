<<<<<<< HEAD
import type { Beneficiary } from '@/data/mockBeneficiary'
import { normalizeListResponse } from './apiEnvelope'
import { request } from './registration'
=======
import type { Beneficiary, PaginatedBeneficiaries } from '@/types/beneficiary'
>>>>>>> 1b669dc (feat: refactor beneficiary data structure and update API integration for pagination)

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

  return response.json() as Promise<PaginatedBeneficiaries>
}

export const getBeneficiary = async (id: string): Promise<Beneficiary> => {
  const response = await fetch(`${API_BASE_URL}/v1/beneficiaries/${encodeURIComponent(id)}`, {
  const response = await fetch(`${API_BASE_URL}/v1/beneficiaries/${encodeURIComponent(id)}`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`)

  const payload: unknown = await response.json()
  // Trata possível wrapper se a API envelopar, caso contrário pega direto
  // Trata possível wrapper se a API envelopar, caso contrário pega direto
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    const data = (payload as { data?: unknown }).data
    if (data && typeof data === 'object') return data as Beneficiary
  }

  return payload as Beneficiary
}

export interface BeneficiaryCreatePayload {
  beneficiaryType: string
  legalName: string
  identificationDocument: string
  country: string
  address: string
  receivingMethod: 'BANK_ACCOUNT' | 'CRYPTO_WALLET'
  bankName?: string
  swiftBic?: string
  accountNumber?: string
  currency?: string
  walletAddress?: string
  blockchainNetwork?: string
  nickname: string
  confirmed: boolean
}

export interface BeneficiaryCreateResult {
  id: string
}

export function createBeneficiary(companyId: string, payload: BeneficiaryCreatePayload) {
  return request<BeneficiaryCreateResult>(
    `/companies/${encodeURIComponent(companyId)}/beneficiaries`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
}

export interface BeneficiaryCreatePayload {
  beneficiaryType: string
  legalName: string
  identificationDocument: string
  country: string
  address: string
  receivingMethod: 'BANK_ACCOUNT' | 'CRYPTO_WALLET'
  bankName?: string
  swiftBic?: string
  accountNumber?: string
  currency?: string
  walletAddress?: string
  blockchainNetwork?: string
  nickname: string
  confirmed: boolean
}

export interface BeneficiaryCreateResult {
  id: string
}

export function createBeneficiary(companyId: string, payload: BeneficiaryCreatePayload) {
  return request<BeneficiaryCreateResult>(
    `/companies/${encodeURIComponent(companyId)}/beneficiaries`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
}
