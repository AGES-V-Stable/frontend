import { ComplianceStatus } from '../components/ComplianceStatusCard/ComplianceStatusType'
import type { CurrentOnboarding, KycStatus } from '../types/onboarding'
import { compliancePath, livenessPath } from '@/shared/navigation/paths'

/** Etapa do cadastro que ainda falta enviar; null quando não há etapa a retomar. */
export function pendingOnboardingPath(onboarding: CurrentOnboarding): string | null {
  if (onboarding.status !== 'PENDING') return null
  if (!onboarding.documentSubmitted) return compliancePath(onboarding.kycVerificationId)
  if (!onboarding.livenessSubmitted) return livenessPath(onboarding.kycVerificationId)
  return null
}

/** Exibe o status retornado por /v1/onboarding/me. */
export function registrationCardStatus(status: KycStatus): ComplianceStatus {
  if (status === 'REJECTED') return ComplianceStatus.NOT_APPROVED
  if (status === 'APPROVED') return ComplianceStatus.APPROVED
  return ComplianceStatus.IN_REVIEW
}
