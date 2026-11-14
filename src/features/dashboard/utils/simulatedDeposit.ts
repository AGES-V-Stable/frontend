import type { User } from '@/features/auth'
import { ApiError } from '@/shared/http/httpClient'

/** O backend só aceita o crédito simulado do proprietário com vínculo ativo na empresa da sessão. */
export function canAddSimulatedBalance(user: User | null): boolean {
  const access = user?.companyAccess
  return Boolean(
    user?.companyId &&
    access &&
    access.status === 'ACTIVE' &&
    access.role === 'OWNER' &&
    access.companyId === user.companyId,
  )
}

/**
 * "20,50" ou "20.50" vira "20.50"; devolve null para valor não positivo, com mais de duas casas ou com
 * separador de milhar. O valor segue como string decimal, sem conversão com perda de precisão.
 */
export function normalizeDepositAmount(text: string): string | null {
  const normalized = text.trim().replace(',', '.')
  if (!/^\d{1,13}(\.\d{1,2})?$/.test(normalized) || !/[1-9]/.test(normalized)) return null
  return normalized
}

const MESSAGES: Record<string, string> = {
  KYC_NOT_APPROVED: 'Conclua a verificação de identidade para adicionar saldo.',
  BALANCE_LIMIT_EXCEEDED:
    'Este valor deixaria o saldo acima do limite permitido. Informe um valor menor.',
  SIMULATED_DEPOSITS_DISABLED: 'O crédito simulado não está disponível neste ambiente.',
  NETWORK_ERROR: 'Não foi possível conectar ao servidor. Tente novamente.',
}

const FORBIDDEN = 'Somente o proprietário da empresa pode adicionar saldo.'
const FALLBACK = 'Não foi possível confirmar a adição de saldo simulado. Tente novamente.'

/** Decide pela `code` do backend, nunca pela frase da mensagem. */
export function describeSimulatedDepositError(error: unknown): string {
  if (!(error instanceof ApiError)) return FALLBACK
  const code = error.code ?? ''
  if (Object.hasOwn(MESSAGES, code)) return MESSAGES[code]!
  if (error.status === 403) return FORBIDDEN
  if (error.status === 400) return 'Informe um valor positivo com até duas casas decimais.'
  return FALLBACK
}
