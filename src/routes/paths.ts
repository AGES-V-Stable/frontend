export const PATHS = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  COMPLIANCE_LIVENESS: '/cadastro/compliance/liveness',
} as const

export type Path = (typeof PATHS)[keyof typeof PATHS]
