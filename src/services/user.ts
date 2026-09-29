import { request } from './registration'

export interface CurrentUser {
  id: string
  name: string
  email: string
  companyId: string
}

export function getCurrentUser(signal?: AbortSignal) {
  return request<CurrentUser>('/users/me', { signal })
}
