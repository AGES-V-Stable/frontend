import { ComplianceStatus } from '@/components/ComplianceStatusCard/ComplianceStatusType'
import type { StatusVariant } from '@/components/Table/StatusBadge'

/** Status de compliance do backend (compliance_status_enum). */
export type BackendComplianceStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'

export const COMPLIANCE_STATUS_LABELS: Record<BackendComplianceStatus, string> = {
  PENDING: 'Cadastro pendente',
  UNDER_REVIEW: 'Em análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
}

export const COMPLIANCE_STATUS_VARIANTS: Record<BackendComplianceStatus, StatusVariant> = {
  PENDING: 'warning',
  UNDER_REVIEW: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
}

export function complianceStatusLabel(status: string | null | undefined): string {
  return (
    COMPLIANCE_STATUS_LABELS[status as BackendComplianceStatus] ?? COMPLIANCE_STATUS_LABELS.PENDING
  )
}

/**
 * Status exibido no cartão de situação cadastral. KYC do representante e
 * KYB/AML da empresa são análises separadas: só está aprovado quando as duas
 * estão aprovadas, e qualquer rejeição reprova.
 */
export function toCardStatus(
  kycStatus: BackendComplianceStatus,
  companyStatus: BackendComplianceStatus | null,
): ComplianceStatus {
  if (kycStatus === 'REJECTED' || companyStatus === 'REJECTED') return ComplianceStatus.NOT_APPROVED
  if (kycStatus === 'APPROVED' && companyStatus === 'APPROVED') return ComplianceStatus.APPROVED
  return ComplianceStatus.IN_REVIEW
}
