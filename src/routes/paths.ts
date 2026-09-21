export const PATHS = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  REGISTER_COMPANY: '/register/empresa',
  REGISTER_COMPANY_PROGRESS: '/register/:progressoCadastroId/empresa',
  REGISTER_COMPLIANCE: '/register/:progressoCadastroId/compliance',
  COMPLIANCE_LIVENESS: '/register/:progressoCadastroId/compliance/liveness',
  REGISTER_COMPLETE: '/register/:progressoCadastroId/concluido',
  ADMIN_CLIENTS: '/admin/clientes-pme',
} as const

export type Path = (typeof PATHS)[keyof typeof PATHS]

export const companyPath = (id: string) => `/register/${encodeURIComponent(id)}/empresa`
export const compliancePath = (id: string) => `/register/${encodeURIComponent(id)}/compliance`
export const livenessPath = (id: string) =>
  `/register/${encodeURIComponent(id)}/compliance/liveness`
export const registrationCompletePath = (id: string) =>
  `/register/${encodeURIComponent(id)}/concluido`
