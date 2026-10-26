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

/** Reprovação em qualquer análise prevalece; a aprovação exige o KYC e a empresa aprovados. */
export function registrationCardStatus(
  kyc: KycStatus,
  company: KycStatus | null,
): ComplianceStatus {
  if (kyc === 'REJECTED' || company === 'REJECTED') return ComplianceStatus.NOT_APPROVED
  if (kyc === 'APPROVED' && company === 'APPROVED') return ComplianceStatus.APPROVED
  return ComplianceStatus.IN_REVIEW
}
