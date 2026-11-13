import type { User } from '@/features/auth'
import type { AssignableRole, CompanyRole, Member } from '../schemas/members'

export const ROLE_LABELS: Record<CompanyRole, string> = {
  OWNER: 'Proprietário',
  OPERATOR: 'Operador',
  VIEWER: 'Visualizador',
}

export const ASSIGNABLE_ROLES: { role: AssignableRole; description: string }[] = [
  {
    role: 'OPERATOR',
    description: 'Consulta a conta, cadastra beneficiários e cria transferências.',
  },
  {
    role: 'VIEWER',
    description: 'Consulta saldo, beneficiários e transferências, sem alterar dados.',
  },
]

/** Quem está usando a tela, para nunca oferecer ações sobre o próprio vínculo. */
export interface MemberViewer {
  userId: string
  membershipId: string
}

/** Somente o proprietário com vínculo ativo na empresa da sessão gerencia membros. */
export function canManageMembers(user: User | null): boolean {
  const access = user?.companyAccess
  return Boolean(
    user?.companyId &&
    access &&
    access.status === 'ACTIVE' &&
    access.role === 'OWNER' &&
    access.companyId === user.companyId &&
    access.permissions.includes('MEMBERS_MANAGE'),
  )
}

/** O proprietário não altera nem remove a si mesmo nem outro proprietário. */
export function canManageMember(member: Member, viewer: MemberViewer): boolean {
  return (
    member.status === 'ACTIVE' &&
    member.role !== 'OWNER' &&
    member.id !== viewer.membershipId &&
    member.userId !== viewer.userId
  )
}
