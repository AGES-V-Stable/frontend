export const PATHS = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  REGISTER_COMPANY: '/register/empresa',
  REGISTER_REPRESENTATIVE: '/register/representante',
  REGISTER_COMPLIANCE: '/register/:kycVerificationId/compliance',
  COMPLIANCE_LIVENESS: '/register/:kycVerificationId/compliance/liveness',
  REGISTER_COMPLETE: '/register/:kycVerificationId/concluido',
  ADMIN_CLIENTS: '/admin/clientes-pme',
  DEMO: '/demo',
  DEMO_HOME: '/demo/home',
  DEMO_LOGIN: '/demo/login',
  DEMO_REGISTER: '/demo/register',
  DEMO_REGISTER_COMPANY: '/demo/register/empresa',
  DEMO_REGISTER_REPRESENTATIVE: '/demo/register/representante',
  DEMO_REGISTER_COMPLIANCE: '/demo/register/compliance',
  DEMO_ADMIN_CLIENTS: '/demo/admin/clientes-pme',
  REGISTER_STATUS: '/register/status',
  FORGOT_PASSWORD: '/esqueci-senha',
  ADMIN_TRANSFERS: '/admin/transferencias',
  ADMIN_BENEFICIARIES: '/admin/beneficiarios',
  BENEFICIARIES: '/beneficiarios',
  BENEFICIARIES_NEW: '/beneficiarios/novo',
  TRANSFERS: '/transferencias',
  TRANSFER_DETAILS: '/transferencias/:id',
} as const

export type Path = (typeof PATHS)[keyof typeof PATHS]

export const compliancePath = (id: string) => `/register/${encodeURIComponent(id)}/compliance`
export const livenessPath = (id: string) =>
  `/register/${encodeURIComponent(id)}/compliance/liveness`
export const registrationCompletePath = (id: string) =>
  `/register/${encodeURIComponent(id)}/concluido`
export const transferDetailsPath = (id: string) => `/transferencias/${encodeURIComponent(id)}`
