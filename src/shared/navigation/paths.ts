export const PATHS = {
  HOME: '/',
  DASHBOARD: '/app/dashboard',
  ADMIN_DASHBOARD: '/admin/dashboard',
  LOGIN: '/login',
  REGISTER: '/register',
  REGISTER_COMPANY: '/register/empresa',
  REGISTER_REPRESENTATIVE: '/register/representante',
  REGISTER_COMPLIANCE: '/register/:kycVerificationId/compliance',
  COMPLIANCE_LIVENESS: '/register/:kycVerificationId/compliance/liveness',
  REGISTER_COMPLETE: '/register/:kycVerificationId/concluido',
  ADMIN_CLIENTS: '/admin/clientes-pme',
  REGISTER_STATUS: '/register/status',
  FORGOT_PASSWORD: '/esqueci-senha',
  ADMIN_TRANSFERS: '/admin/transferencias',
  ADMIN_BENEFICIARIES: '/admin/beneficiarios',
  BENEFICIARIES: '/app/beneficiarios',
  BENEFICIARIES_NEW: '/app/beneficiarios/novo',
  TRANSFERS: '/app/transferencias/nova',
  TRANSFER_DETAILS: '/app/transferencias/:id',
} as const

export type Path = (typeof PATHS)[keyof typeof PATHS]

export const compliancePath = (id: string) => `/register/${encodeURIComponent(id)}/compliance`
export const livenessPath = (id: string) =>
  `/register/${encodeURIComponent(id)}/compliance/liveness`
export const registrationCompletePath = (id: string) =>
  `/register/${encodeURIComponent(id)}/concluido`
export const transferDetailsPath = (id: string) => `/app/transferencias/${encodeURIComponent(id)}`
