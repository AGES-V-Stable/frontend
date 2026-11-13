import { z } from 'zod'
import { ApiError, HttpError } from '@/shared/http/httpClient'

export type InvitationAction = 'create' | 'link' | 'regenerate' | 'revoke'

export interface InvitationFailure {
  message: string
  /**
   * O convite mudou no servidor (aceito, revogado, regenerado em outra sessão ou inexistente):
   * a lista precisa ser recarregada, sem repetir a ação automaticamente.
   */
  stale: boolean
  /** Campo do formulário de convite a corrigir. */
  field?: 'email'
}

const FALLBACK_MESSAGES: Record<InvitationAction, string> = {
  create: 'Não foi possível criar o convite. Tente novamente.',
  link: 'Não foi possível obter o link do convite. Tente novamente.',
  regenerate: 'Não foi possível gerar um novo link. Tente novamente.',
  revoke: 'Não foi possível revogar o convite. Tente novamente.',
}

const STALE_MESSAGES: Record<string, string> = {
  INVITATION_ALREADY_USED: 'Este convite já foi aceito. A lista foi atualizada.',
  INVITATION_REVOKED: 'Este convite foi revogado. A lista foi atualizada.',
  INVITATION_NOT_REGENERABLE: 'Este convite não está mais pendente. A lista foi atualizada.',
  INVITATION_NOT_FOUND: 'Este convite não existe mais. A lista foi atualizada.',
  RESOURCE_VERSION_MISMATCH:
    'Este convite foi alterado em outra sessão. A lista foi atualizada; revise e tente novamente.',
}

const EMAIL_MESSAGES: Record<string, string> = {
  MEMBER_ALREADY_EXISTS: 'Este e-mail já pertence a um membro desta empresa.',
  USER_IN_OTHER_COMPANY:
    'Este e-mail já está vinculado a outra empresa e não pode receber o convite.',
  EMAIL_RESERVED: 'Este e-mail não pode receber um convite.',
}

const FORBIDDEN_CODES = new Set([
  'OWNER_REQUIRED',
  'PERMISSION_DENIED',
  'COMPANY_ACCESS_DENIED',
  'COMPANY_ACCESS_REVOKED',
])

const ExistingInvitationSchema = z.object({ details: z.object({ invitationId: z.string() }) })

/** Id do convite pendente que já existe para o e-mail (409 INVITATION_ALREADY_EXISTS). */
export function existingInvitationId(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.code !== 'INVITATION_ALREADY_EXISTS') return null
  const parsed = ExistingInvitationSchema.safeParse(error.body)
  return parsed.success ? parsed.data.details.invitationId : null
}

/** "45 segundos", "1 minuto", "3 minutos". */
export function formatWait(seconds: number): string {
  if (seconds < 60) return seconds === 1 ? '1 segundo' : `${seconds} segundos`
  const minutes = Math.ceil(seconds / 60)
  return minutes === 1 ? '1 minuto' : `${minutes} minutos`
}

function rateLimitMessage(error: ApiError, action: InvitationAction): string {
  const seconds = error instanceof HttpError ? error.retryAfterSeconds : undefined
  if (action === 'regenerate' && error.code === 'INVITATION_RATE_LIMITED' && seconds)
    return `Aguarde ${formatWait(seconds)} para gerar um novo link deste convite.`
  return 'Muitas tentativas. Aguarde um momento e tente novamente.'
}

/** Decide o comportamento pelo `code` do backend, nunca pela frase da mensagem. */
export function describeInvitationError(
  error: unknown,
  action: InvitationAction,
): InvitationFailure {
  const fallback = { message: FALLBACK_MESSAGES[action], stale: false }
  if (!(error instanceof ApiError)) return fallback
  const code = error.code ?? ''
  if (action === 'create' && code in EMAIL_MESSAGES)
    return { message: EMAIL_MESSAGES[code]!, stale: false, field: 'email' }
  if (action !== 'create' && code in STALE_MESSAGES)
    return { message: STALE_MESSAGES[code]!, stale: true }
  if (error.status === 403 || FORBIDDEN_CODES.has(code))
    return {
      message: 'Você não tem permissão para gerenciar convites desta empresa.',
      stale: false,
    }
  if (error.status === 429) return { message: rateLimitMessage(error, action), stale: false }
  if (action === 'create' && error.status === 400)
    return { message: 'Revise o nome, o e-mail e o perfil informados.', stale: false }
  if (code === 'NETWORK_ERROR')
    return { message: 'Não foi possível conectar ao servidor. Tente novamente.', stale: false }
  return fallback
}
