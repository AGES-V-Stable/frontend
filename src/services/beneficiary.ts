import type { Beneficiary, PaginatedBeneficiaries } from '@/types/beneficiary'

import { apiJson, jsonBody } from './api'

export interface GetBeneficiariesParams {
  /** Página base 1 (como na UI); convertida para base 0 do Spring aqui. */
  page?: number
  size?: number
  companyId?: string
  search?: string
  document?: string
  country?: string
}

function buildQuery(params: GetBeneficiariesParams, includeCompany: boolean) {
  const queryParams = new URLSearchParams()

  // O backend Spring espera page em base 0, o front envia em base 1.
  queryParams.append('page', String(Math.max((params.page || 1) - 1, 0)))
  queryParams.append('size', String(params.size || 10))

  if (includeCompany && params.companyId) queryParams.append('companyId', params.companyId)
  if (params.search) queryParams.append('search', params.search)
  if (params.document) queryParams.append('document', params.document)
  if (params.country) queryParams.append('country', params.country)

  return queryParams.toString()
}

/** Listagem global (somente administradores). */
export const getBeneficiaries = (
  params: GetBeneficiariesParams = {},
): Promise<PaginatedBeneficiaries> =>
  apiJson<PaginatedBeneficiaries>(`/beneficiaries?${buildQuery(params, true)}`)

/** Detalhe global (somente administradores). */
export const getBeneficiary = (id: string): Promise<Beneficiary> =>
  apiJson<Beneficiary>(`/beneficiaries/${encodeURIComponent(id)}`)

/** Beneficiários da empresa do usuário logado (área do cliente). */
export const getCompanyBeneficiaries = (
  companyId: string,
  params: Omit<GetBeneficiariesParams, 'companyId'> = {},
  signal?: AbortSignal,
): Promise<PaginatedBeneficiaries> =>
  apiJson<PaginatedBeneficiaries>(
    `/companies/${encodeURIComponent(companyId)}/beneficiaries?${buildQuery(params, false)}`,
    { signal },
  )

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

/** O backend devolve o BeneficiaryResponse completo; a tela de criação só precisa do id. */
export interface BeneficiaryCreateResult {
  id: string
}

export function createBeneficiary(companyId: string, payload: BeneficiaryCreatePayload) {
  return apiJson<BeneficiaryCreateResult>(
    `/companies/${encodeURIComponent(companyId)}/beneficiaries`,
    { method: 'POST', ...jsonBody(payload) },
  )
}
