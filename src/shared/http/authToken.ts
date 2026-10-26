const ACCESS_TOKEN_KEY = 'vstable:onboarding:access-token'
const LOGIN_TOKEN_KEY = 'token'
const SESSION_EXPIRED_KEY = 'vstable:session-expired'

/**
 * Fonte única do token enviado ao backend. Existem duas origens:
 * - onboarding: JWT emitido logo após criar a conta, que autentica as chamadas de
 *   compliance/liveness/KYC antes de existir qualquer login (sessionStorage);
 * - login: JWT devolvido pelo login (localStorage).
 * Nenhum outro módulo deve ler ou gravar esses tokens diretamente no storage.
 */
export function saveAccessToken(token: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
}

/** Grava o token do login e descarta um token de onboarding que tenha sobrado na aba. */
export function saveLoginToken(token: string): void {
  localStorage.setItem(LOGIN_TOKEN_KEY, token)
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(SESSION_EXPIRED_KEY)
  window.dispatchEvent(new Event(SESSION_CHANGED))
}

/** Token da sessão ativa: o do onboarding, se houver; senão o do login. */
export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem(LOGIN_TOKEN_KEY)
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}

export const SESSION_CHANGED = 'vstable:session-changed'
export function getLoginToken(): string | null {
  return localStorage.getItem(LOGIN_TOKEN_KEY)
}

/** Identifica apenas o dono do cache local; a autorização continua sendo do backend. */
export function getStoredUserId(): string | undefined {
  const token = getLoginToken() ?? getAccessToken()
  if (!token) return undefined
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(payload), (character) => character.charCodeAt(0))
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes))
    if (typeof claims === 'object' && claims !== null && 'sub' in claims) {
      return typeof claims.sub === 'string' && claims.sub.trim() ? claims.sub : undefined
    }
  } catch {
    // Sem identidade válida, não compartilha nem persiste o estado de 2FA.
  }
  return undefined
}
export function clearLoginToken(): void {
  localStorage.removeItem(LOGIN_TOKEN_KEY)
  window.dispatchEvent(new Event(SESSION_CHANGED))
}
export function invalidateToken(token: string): void {
  if (sessionStorage.getItem(ACCESS_TOKEN_KEY) === token) clearAccessToken()
  if (getLoginToken() === token) {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, 'true')
    clearLoginToken()
  }
}

/** Indica se o backend recusou o token do login, para o aviso na tela de login. */
export function wasSessionExpired(): boolean {
  return sessionStorage.getItem(SESSION_EXPIRED_KEY) === 'true'
}
export function clearSessionExpired(): void {
  sessionStorage.removeItem(SESSION_EXPIRED_KEY)
}
