import { z } from 'zod'

export const CompanyRoleSchema = z.enum(['OWNER', 'OPERATOR', 'VIEWER'])
export type CompanyRole = z.infer<typeof CompanyRoleSchema>
/** Perfis atribuíveis a um membro; o proprietário nunca é alterado por esta tela. */
export type AssignableRole = Exclude<CompanyRole, 'OWNER'>

export const MemberSchema = z.object({
  /** Identificador do vínculo; não é o id do usuário. */
  id: z.string(),
  userId: z.string(),
  companyId: z.string(),
  name: z.string(),
  email: z.string(),
  role: CompanyRoleSchema,
  status: z.enum(['ACTIVE', 'REMOVED']),
  /** Versão do vínculo, enviada de volta em If-Match. */
  version: z.number().int().positive(),
  joinedAt: z.string(),
  removedAt: z.string().nullable(),
})
export type Member = z.infer<typeof MemberSchema>

export const InvitationSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  name: z.string(),
  email: z.string(),
  role: CompanyRoleSchema,
  status: z.enum(['PENDING', 'ACCEPTED', 'REVOKED']),
  version: z.number().int().positive(),
})
export type Invitation = z.infer<typeof InvitationSchema>

export const MemberListItemSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('MEMBER'), member: MemberSchema }),
  z.object({ kind: z.literal('INVITATION'), invitation: InvitationSchema }),
])
export type MemberListItem = z.infer<typeof MemberListItemSchema>

export const MemberListResponseSchema = z.object({
  items: z.array(MemberListItemSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  summary: z.object({
    activeMembers: z.number().int().nonnegative(),
    pendingInvitations: z.number().int().nonnegative(),
    peopleCount: z.number().int().nonnegative(),
  }),
})
export type MemberListResponse = z.infer<typeof MemberListResponseSchema>
