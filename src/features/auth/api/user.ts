import { getLoginToken } from '@/shared/http/authToken'
import { z } from 'zod'
import { httpRequest } from '@/shared/http/httpClient'

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  companyId: z.string().nullable(),
  accountType: z.enum(['ADMIN', 'USER']),
  roles: z.array(z.string()),
  withdrawalLockedUntil: z.string().nullable().optional(),
})
export type User = z.infer<typeof UserSchema>
export const CompanySchema = z.object({
  id: z.string(),
  legalName: z.string(),
  tradeName: z.string().nullable().optional(),
  cnpj: z.string(),
})
export type Company = z.infer<typeof CompanySchema>
export async function getCurrentUser(signal?: AbortSignal): Promise<User> {
  return UserSchema.parse(
    await httpRequest<unknown>(
      '/v1/users/me',
      { signal, headers: getLoginToken() ? { Authorization: `Bearer ${getLoginToken()}` } : {} },
      false,
    ),
  )
}
export async function getCompanyProfile(companyId: string, signal?: AbortSignal): Promise<Company> {
  return CompanySchema.parse(
    await httpRequest<unknown>(
      `/v1/companies/${encodeURIComponent(companyId)}`,
      { signal, headers: getLoginToken() ? { Authorization: `Bearer ${getLoginToken()}` } : {} },
      false,
    ),
  )
}
