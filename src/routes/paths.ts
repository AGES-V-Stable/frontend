export const PATHS = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
} as const

export type Path = (typeof PATHS)[keyof typeof PATHS]
