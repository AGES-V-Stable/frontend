export const PATHS = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  ADMIN_CLIENTS: '/admin/clientes-pme',
} as const

export type Path = (typeof PATHS)[keyof typeof PATHS]
