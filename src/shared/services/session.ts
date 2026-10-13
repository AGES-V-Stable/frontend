import { z } from 'zod'

import { getAccessToken } from './authToken'

import { parseJwt } from '@/shared/utils/jwt'

export type UserType = 'admin' | 'pme'

const TOKEN_KEY = 'token'

const roleSchema = z.object({
  role: z.union([z.string(), z.array(z.string())]),
})

export function hasStoredToken(): boolean {
  return !!localStorage.getItem(TOKEN_KEY)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function getStoredUserType(): UserType {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return 'pme'

  const result = roleSchema.safeParse(parseJwt(token))
  if (!result.success) return 'pme'

  const roles = typeof result.data.role === 'string' ? [result.data.role] : result.data.role
  return roles.some((role) => role === 'ADMIN' || role === 'ROLE_ADMIN') ? 'admin' : 'pme'
}

export function accountRequestOptions(signal?: AbortSignal): RequestInit {
  const token = localStorage.getItem(TOKEN_KEY) || getAccessToken()
  return { signal, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) }
}
