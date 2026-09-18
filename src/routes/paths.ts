export const PATHS = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  REGISTER_COMPANY: '/register/empresa',
  REGISTER_COMPANY_PROGRESS: '/register/:progressoCadastroId/empresa',
  REGISTER_REPRESENTATIVE: '/register/:progressoCadastroId/representante',
  REGISTER_COMPLIANCE: '/register/:progressoCadastroId/compliance',
  REGISTER_COMPLETE: '/register/:progressoCadastroId/conclusao',
  ADMIN_CLIENTS: '/admin/clientes-pme',
  DEMO: '/demo',
  DEMO_HOME: '/demo/home',
  DEMO_LOGIN: '/demo/login',
  DEMO_REGISTER: '/demo/register',
  DEMO_REGISTER_COMPANY: '/demo/register/empresa',
  DEMO_REGISTER_REPRESENTATIVE: '/demo/register/representante',
  DEMO_REGISTER_COMPLIANCE: '/demo/register/compliance',
  DEMO_ADMIN_CLIENTS: '/demo/admin/clientes-pme',
} as const

export type Path = (typeof PATHS)[keyof typeof PATHS]

export const companyPath = (id: string) => `/register/${encodeURIComponent(id)}/empresa`
export const representativePath = (id: string) =>
  `/register/${encodeURIComponent(id)}/representante`
export const compliancePath = (id: string) => `/register/${encodeURIComponent(id)}/compliance`
export const completionPath = (id: string) => `/register/${encodeURIComponent(id)}/conclusao`
