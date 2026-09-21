export const PATHS = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  REGISTER_COMPLIANCE: '/register/:kycVerificationId/compliance',
  COMPLIANCE_LIVENESS: '/register/:kycVerificationId/compliance/liveness',
  REGISTER_COMPLETE: '/register/:kycVerificationId/concluido',
  ADMIN_CLIENTS: '/admin/clientes-pme',
} as const

export type Path = (typeof PATHS)[keyof typeof PATHS]

export const compliancePath = (id: string) => `/register/${encodeURIComponent(id)}/compliance`
export const livenessPath = (id: string) =>
  `/register/${encodeURIComponent(id)}/compliance/liveness`
export const registrationCompletePath = (id: string) =>
  `/register/${encodeURIComponent(id)}/concluido`
