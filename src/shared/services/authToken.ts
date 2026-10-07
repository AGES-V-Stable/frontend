const ACCESS_TOKEN_KEY = 'vstable:onboarding:access-token'

/**
 * O onboarding devolve um JWT de acesso (emitido logo após criar a conta) que
 * autentica as chamadas de compliance/liveness/KYC seguintes — essas rotas
 * exigem autenticação e não existe nenhum outro passo de login antes delas.
 */
export function saveAccessToken(token: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}
