import type { BackendComplianceStatus } from '@/utils/complianceStatus'

import { apiJson } from './api'

/** GET /v1/companies/{id}/compliance-status (membros da empresa ou administradores). */
export interface CompanyComplianceStatus {
  id: string
  legalName: string
  tradeName: string | null
  cnpj: string
  statusKyb: BackendComplianceStatus
  statusAml: BackendComplianceStatus
  overallStatus: BackendComplianceStatus
  documents: unknown[]
}

export function getCompanyComplianceStatus(companyId: string, signal?: AbortSignal) {
  return apiJson<CompanyComplianceStatus>(
    `/companies/${encodeURIComponent(companyId)}/compliance-status`,
    { signal },
  )
}
