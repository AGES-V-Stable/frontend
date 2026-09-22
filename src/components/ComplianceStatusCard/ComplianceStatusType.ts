export const ComplianceStatus = {
  EM_ANALISE: 'EM_ANALISE',
  APROVADO: 'APROVADO',
  NAO_APROVADO: 'NAO_APROVADO',
} as const

export type ComplianceStatus = (typeof ComplianceStatus)[keyof typeof ComplianceStatus]
