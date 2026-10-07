import { request } from './apiClient'
import { accountRequestOptions } from './session'

export interface CurrentUser {
  id: string
  name: string
  email: string
  companyId: string
}

export function getCurrentUser(signal?: AbortSignal) {
  return request<CurrentUser>('/users/me', accountRequestOptions(signal))
}
