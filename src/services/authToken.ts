import { parseJwt } from '@/utils/jwt'

/**
 * Única fonte do token de acesso do frontend. Tanto o login quanto o
 * onboarding (que já devolve um JWT ao criar a conta) gravam aqui, e todas as
 * chamadas protegidas leem daqui — assim todas as rotas operam sob a mesma
 * identidade.
 */
const ACCESS_TOKEN_KEY = 'vstable:access-token'

/** Chaves antigas: o onboarding usava sessionStorage e o login usava localStorage['token']. */
const LEGACY_SESSION_TOKEN_KEY = 'vstable:onboarding:access-token'
const LEGACY_LOCAL_TOKEN_KEY = 'token'

/** Prefixo de todos os dados do frontend ligados à identidade da sessão. */
const SESSION_DATA_PREFIX = 'vstable:'

export interface SessionClaims {
  email: string
  roles: string[]
  accountType: 'ADMIN' | 'USER'
  expiresAt: number | null
}

function clearLegacyTokens(): void {
  sessionStorage.removeItem(LEGACY_SESSION_TOKEN_KEY)
  localStorage.removeItem(LEGACY_LOCAL_TOKEN_KEY)
}

export function saveAccessToken(token: string): void {
  clearLegacyTokens()
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function getAccessToken(): string | null {
  const token = sessionStorage.getItem(ACCESS_TOKEN_KEY)
  if (token) return token

  // Migra um onboarding em andamento que ainda usa a chave antiga.
  const legacy = sessionStorage.getItem(LEGACY_SESSION_TOKEN_KEY)
  if (legacy) {
    saveAccessToken(legacy)
    return legacy
  }
  localStorage.removeItem(LEGACY_LOCAL_TOKEN_KEY)
  return null
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  clearLegacyTokens()
}

/**
 * Logout / troca de conta: remove o token e todo dado em cache que depende da
 * identidade (dados pessoais do KYC, sessão de liveness etc.).
 */
export function clearSession(): void {
  clearAccessToken()
  for (const storage of [sessionStorage, localStorage]) {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    for (const key of keys) {
      if (key?.startsWith(SESSION_DATA_PREFIX)) storage.removeItem(key)
    }
  }
}

/** Claims do token atual, ou null se não houver token válido (ausente, ilegível ou expirado). */
export function getSessionClaims(now: number = Date.now()): SessionClaims | null {
  const token = getAccessToken()
  if (!token) return null

  const payload = parseJwt(token) as {
    sub?: string
    role?: unknown
    account_type?: string
    exp?: number
  } | null
  if (!payload || typeof payload.sub !== 'string') return null

  const expiresAt = typeof payload.exp === 'number' ? payload.exp * 1000 : null
  if (expiresAt !== null && expiresAt <= now) return null

  const roles = Array.isArray(payload.role)
    ? payload.role.filter((role): role is string => typeof role === 'string')
    : []

  return {
    email: payload.sub,
    roles,
    accountType: payload.account_type === 'ADMIN' ? 'ADMIN' : 'USER',
    expiresAt,
  }
}

export function isAdminSession(claims: SessionClaims | null = getSessionClaims()): boolean {
  return Boolean(claims && (claims.accountType === 'ADMIN' || claims.roles.includes('ROLE_ADMIN')))
}
