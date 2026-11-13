import { getLoginToken } from '@/shared/http/authToken'
import { z } from 'zod'
import { httpRequest } from '@/shared/http/httpClient'

/** Vínculo atual com a empresa; as permissões são calculadas pelo backend. */
const CompanyAccessSchema = z.object({
  membershipId: z.string(),
  companyId: z.string(),
  role: z.enum(['OWNER', 'OPERATOR', 'VIEWER']),
  status: z.enum(['ACTIVE', 'REMOVED']),
  permissions: z.array(z.string()),
  version: z.number().int(),
})
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  companyId: z.string().nullable(),
  accountType: z.enum(['ADMIN', 'USER']),
  roles: z.array(z.string()),
  twoFactorEnabled: z.boolean().optional(),
  withdrawalLockedUntil: z.string().nullable().optional(),
  companyAccess: CompanyAccessSchema.nullable().optional(),
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
