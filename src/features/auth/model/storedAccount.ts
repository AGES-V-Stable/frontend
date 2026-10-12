import { z } from 'zod'
import { getLoginToken } from '@/shared/http/authToken'

const ClaimsSchema = z.object({
  account_type: z.enum(['ADMIN', 'USER']).optional(),
  role: z.array(z.string()).optional(),
})

/** Selects the UI profile from the stored login JWT; backend authorization remains authoritative. */
export function isStoredAdmin(): boolean {
  const token = getLoginToken()
  if (!token) return false
  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
    const claims = ClaimsSchema.parse(JSON.parse(new TextDecoder().decode(bytes)))
    return claims.account_type
      ? claims.account_type === 'ADMIN'
      : (claims.role?.includes('ROLE_ADMIN') ?? false)
  } catch {
    return false
  }
}
