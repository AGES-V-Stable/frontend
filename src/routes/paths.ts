export const PATHS = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  REGISTER_COMPANY: '/register/empresa',
  REGISTER_COMPANY_PROGRESS: '/register/:progressoCadastroId/empresa',
  REGISTER_COMPLIANCE: '/register/:progressoCadastroId/compliance',
  REGISTER_STATUS: '/register/status',
  ADMIN_CLIENTS: '/admin/clientes-pme',
  ADMIN_TRANSFERS: '/admin/transferencias',
  ADMIN_BENEFICIARIES: '/admin/beneficiarios',
} as const

export type Path = (typeof PATHS)[keyof typeof PATHS]

export const companyPath = (id: string) => `/register/${encodeURIComponent(id)}/empresa`
export const compliancePath = (id: string) => `/register/${encodeURIComponent(id)}/compliance`
