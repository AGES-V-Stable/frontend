export const PATHS = {
  HOME: '/',
  LOGIN: '/login',
} as const

export type Path = (typeof PATHS)[keyof typeof PATHS]
