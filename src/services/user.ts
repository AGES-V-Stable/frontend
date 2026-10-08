import { apiJson } from './api'

export interface CurrentUser {
  id: string
  name: string
  email: string
  /** null para administradores (não pertencem a uma empresa). */
  companyId: string | null
  accountType: 'ADMIN' | 'USER'
  roles: string[]
}

export function getCurrentUser(signal?: AbortSignal) {
  return apiJson<CurrentUser>('/users/me', { signal })
}
