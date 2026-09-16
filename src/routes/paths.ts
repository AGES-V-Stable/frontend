export const PATHS = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  REGISTER_COMPANY: '/register/empresa',
  REGISTER_COMPANY_PROGRESS: '/register/:progressoCadastroId/empresa',
  REGISTER_COMPLIANCE: '/register/:progressoCadastroId/compliance',
  ADMIN_CLIENTS: '/admin/clientes-pme',
  COMPLIANCE_LIVENESS: '/cadastro/compliance/liveness',
} as const

export type Path = (typeof PATHS)[keyof typeof PATHS]

export const companyPath = (id: string) => `/register/${encodeURIComponent(id)}/empresa`
export const compliancePath = (id: string) => `/register/${encodeURIComponent(id)}/compliance`
