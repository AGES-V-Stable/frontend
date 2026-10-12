import { z } from 'zod'
import { httpRequest } from '@/shared/http/httpClient'
import { BeneficiarySchema, BeneficiariesPageSchema } from '../schemas/beneficiary'
import type { Beneficiary, PaginatedBeneficiaries } from '../types/beneficiary'

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

export async function createBeneficiary(
  companyId: string,
  payload: BeneficiaryCreatePayload,
): Promise<{ id: string }> {
  return z.object({ id: z.string() }).parse(
    await httpRequest<unknown>(`/v1/companies/${encodeURIComponent(companyId)}/beneficiaries`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  )
}
export async function getBeneficiaries(
  params: GetBeneficiariesParams = {},
  signal?: AbortSignal,
): Promise<PaginatedBeneficiaries> {
  const query = new URLSearchParams({
    page: String(Math.max(0, (params.page ?? 1) - 1)),
    size: String(params.size ?? 20),
  })
  for (const key of ['search', 'country', 'document'] as const)
    if (params[key]) query.set(key, params[key])
  const endpoint = params.companyId
    ? `/v1/companies/${encodeURIComponent(params.companyId)}/beneficiaries`
    : '/v1/beneficiaries'
  return BeneficiariesPageSchema.parse(
    await httpRequest<unknown>(`${endpoint}?${query}`, { signal }),
  )
}
export async function getBeneficiary(
  id: string,
  companyId?: string,
  signal?: AbortSignal,
): Promise<Beneficiary> {
  const endpoint = companyId
    ? `/v1/companies/${encodeURIComponent(companyId)}/beneficiaries/${encodeURIComponent(id)}`
    : `/v1/beneficiaries/${encodeURIComponent(id)}`
  return BeneficiarySchema.parse(await httpRequest<unknown>(endpoint, { signal }))
}
export type GetCompanyBeneficiariesParams = Omit<GetBeneficiariesParams, 'companyId'>
export function getCompanyBeneficiaries(
  companyId: string,
  params: GetCompanyBeneficiariesParams = {},
  signal?: AbortSignal,
): Promise<PaginatedBeneficiaries> {
  return getBeneficiaries({ ...params, companyId }, signal)
}
