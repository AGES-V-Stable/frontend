import { INVITATION_TOKEN_PATTERN } from '../schemas/invitation'

/**
 * O token do convite vive só nesta aba (sessionStorage, com cópia em memória se o storage
 * estiver indisponível) enquanto o fluxo de login/2FA acontece. Nunca usar localStorage,
 * URL de API, estado de navegação ou logs para ele.
 */
const STORAGE_KEY = 'vstable:company-invitation'
let memoryToken: string | null = null

/** Extrai o token do fragmento `#token=<token>`; formato inesperado resulta em `null`. */
export function tokenFromHash(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('token')
  return token && INVITATION_TOKEN_PATTERN.test(token) ? token : null
}

export function saveInvitationToken(token: string): void {
  memoryToken = token
  try {
    sessionStorage.setItem(STORAGE_KEY, token)
  } catch {
    // Storage bloqueado: a cópia em memória mantém o fluxo enquanto a página estiver aberta.
  }
}

export function readInvitationToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? memoryToken
  } catch {
    return memoryToken
  }
}

export function clearInvitationToken(): void {
  memoryToken = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nada a limpar quando o storage está indisponível.
  }
}
