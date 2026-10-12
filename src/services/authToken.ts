const ACCESS_TOKEN_KEY = 'vstable:onboarding:access-token'
const LOGIN_TOKEN_KEY = 'token'

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
}

/** Token da sessão ativa: o do onboarding, se houver; senão o do login. */
export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem(LOGIN_TOKEN_KEY)
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}
