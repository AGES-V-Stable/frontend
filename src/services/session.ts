import { clearSession } from './authToken'

/** Encerra a sessão local (token + dados ligados à identidade). Não há endpoint de logout: o JWT é stateless. */
export function logout(): void {
  clearSession()
}
