import { describe, expect, it } from 'vitest'

import { ComplianceStatus } from '@/features/onboarding/components/ComplianceStatusCard/ComplianceStatusType'
import {
  pendingOnboardingPath,
  registrationCardStatus,
} from '@/features/onboarding/model/registrationStatus'
import type { CurrentOnboarding } from '@/features/onboarding/types/onboarding'

const onboarding: CurrentOnboarding = {
  kycVerificationId: 'kyc-1',
  companyId: 'c1',
  status: 'PENDING',
  documentSubmitted: true,
  livenessSubmitted: true,
}

describe('pendingOnboardingPath', () => {
  it('resumes at the document step when no document was sent', () => {
    expect(pendingOnboardingPath({ ...onboarding, documentSubmitted: false })).toBe(
      '/register/kyc-1/compliance',
    )
  })

  it('resumes at the liveness step when only the liveness is missing', () => {
    expect(pendingOnboardingPath({ ...onboarding, livenessSubmitted: false })).toBe(
      '/register/kyc-1/compliance/liveness',
    )
  })

  it('has nothing to resume when every step was sent', () => {
    expect(pendingOnboardingPath(onboarding)).toBeNull()
  })

  it('has nothing to resume once the verification left the pending state', () => {
    expect(
      pendingOnboardingPath({ ...onboarding, status: 'UNDER_REVIEW', documentSubmitted: false }),
    ).toBeNull()
  })
})

describe('registrationCardStatus', () => {
  it.each([
    ['REJECTED', 'APPROVED', ComplianceStatus.NOT_APPROVED],
    ['APPROVED', 'REJECTED', ComplianceStatus.NOT_APPROVED],
    ['APPROVED', 'APPROVED', ComplianceStatus.APPROVED],
    ['APPROVED', 'UNDER_REVIEW', ComplianceStatus.IN_REVIEW],
    ['APPROVED', null, ComplianceStatus.IN_REVIEW],
    ['UNDER_REVIEW', 'APPROVED', ComplianceStatus.IN_REVIEW],
    ['PENDING', null, ComplianceStatus.IN_REVIEW],
  ] as const)('maps KYC %s and company %s to %s', (kyc, company, expected) => {
    expect(registrationCardStatus(kyc, company)).toBe(expected)
  })
})
