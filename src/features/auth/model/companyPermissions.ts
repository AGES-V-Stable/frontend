import type { User } from '../api/user'

/** Capacidades calculadas pelo backend a partir do vínculo atual com a empresa. */
export type CompanyPermission =
  | 'COMPANY_READ'
  | 'BALANCE_READ'
  | 'BENEFICIARY_READ'
  | 'TRANSFER_READ'
  | 'BENEFICIARY_WRITE'
  | 'TRANSFER_CREATE'
  | 'MEMBERS_READ'
  | 'MEMBERS_MANAGE'
  | 'SELF_MEMBERSHIP_READ'

/**
 * O usuário tem a capacidade na empresa da sessão? Exige vínculo ativo na mesma empresa; sem
 * vínculo (administrador da plataforma, conta sem empresa ou acesso removido) nada é concedido.
 * Serve para apresentar o conteúdo autorizado: a autorização efetiva continua sendo do backend.
 */
export function hasCompanyPermission(user: User | null, permission: CompanyPermission): boolean {
  const access = user?.companyAccess
  return Boolean(
    user?.companyId &&
    access &&
    access.status === 'ACTIVE' &&
    access.companyId === user.companyId &&
    access.permissions.includes(permission),
  )
}
