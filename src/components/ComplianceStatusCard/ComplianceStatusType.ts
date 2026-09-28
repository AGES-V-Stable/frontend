export const ComplianceStatus = {
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  NOT_APPROVED: 'NOT_APPROVED',
} as const

export type ComplianceStatus = (typeof ComplianceStatus)[keyof typeof ComplianceStatus]
