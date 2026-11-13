import { ApiError } from '@/shared/http/httpClient'

export type MemberAction = 'update' | 'remove'

export interface MemberActionFailure {
  message: string
  /**
   * O vínculo mudou no servidor (alterado por outra pessoa, já removido ou protegido):
   * a lista precisa ser recarregada e a ação confirmada de novo, sem sobrescrever nada.
   */
  stale: boolean
}

const STALE_MESSAGES: Record<string, string> = {
  RESOURCE_VERSION_MISMATCH:
    'Este membro foi alterado em outra sessão. A lista foi atualizada; revise e tente novamente.',
  MEMBER_NOT_FOUND: 'Este membro não faz mais parte da empresa. A lista foi atualizada.',
  MEMBERSHIP_NOT_ACTIVE: 'Este membro não faz mais parte da empresa. A lista foi atualizada.',
  OWNER_PROTECTED: 'O proprietário da empresa não pode ser alterado nem removido.',
}

const FORBIDDEN_CODES = new Set([
  'OWNER_REQUIRED',
  'PERMISSION_DENIED',
  'COMPANY_ACCESS_DENIED',
  'COMPANY_ACCESS_REVOKED',
])

/** Decide o comportamento pelo `code` do backend, nunca pela frase da mensagem. */
export function describeMemberActionError(
  error: unknown,
  action: MemberAction,
): MemberActionFailure {
  const fallback =
    action === 'update'
      ? 'Não foi possível salvar as alterações. Tente novamente.'
      : 'Não foi possível remover o acesso. Tente novamente.'
  if (!(error instanceof ApiError)) return { message: fallback, stale: false }
  const code = error.code ?? ''
  if (code in STALE_MESSAGES) return { message: STALE_MESSAGES[code]!, stale: true }
  if (error.status === 403 || FORBIDDEN_CODES.has(code))
    return { message: 'Você não tem permissão para gerenciar membros desta empresa.', stale: false }
  if (error.status === 429)
    return { message: 'Muitas tentativas. Aguarde um momento e tente novamente.', stale: false }
  if (code === 'NETWORK_ERROR')
    return { message: 'Não foi possível conectar ao servidor. Tente novamente.', stale: false }
  return { message: fallback, stale: false }
}
