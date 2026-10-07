import { z } from 'zod'

import { request } from './apiClient'
import { accountRequestOptions } from './session'

const companySchema = z.object({
  id: z.string(),
  legalName: z.string(),
  tradeName: z.string().nullable().optional(),
  cnpj: z.string(),
  availableBalanceBrl: z.number().finite().nonnegative().nullable().optional(),
})
const complianceStatusSchema = z.object({
  overallStatus: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']),
})

export type Company = z.infer<typeof companySchema>

export async function getCompany(id: string, signal?: AbortSignal): Promise<Company> {
  return companySchema.parse(
    await request<unknown>(`/companies/${encodeURIComponent(id)}`, accountRequestOptions(signal)),
  )
}

export async function getCompanyComplianceStatus(id: string, signal?: AbortSignal) {
  return complianceStatusSchema.parse(
    await request<unknown>(
      `/companies/${encodeURIComponent(id)}/compliance-status`,
      accountRequestOptions(signal),
    ),
  ).overallStatus
}
