import { z } from 'zod'

/** Token do link: 32 bytes aleatórios em base64url sem padding (C-06). */
export const INVITATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

/**
 * Links de termos vêm da configuração do backend (por padrão `${INVITATION_FRONTEND_ORIGIN}/...`):
 * aceita caminhos internos, URLs da própria origem do frontend (inclusive `http://localhost` em
 * desenvolvimento) ou HTTPS. Recusa `javascript:`, `data:`, `//host` e HTTP de terceiros.
 */
const safeLink = z.string().refine((value) => {
  if (/^\/(?!\/)/.test(value)) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.origin === window.location.origin
  } catch {
    return false
  }
}, 'Link inválido')

export const InvitationSchema = z.object({
  invitationId: z.string().min(1),
  company: z.object({ id: z.string().min(1), name: z.string().min(1) }),
  invitedBy: z.object({ name: z.string().min(1) }),
  recipient: z.object({ name: z.string(), email: z.string().min(1) }),
  role: z.enum(['OPERATOR', 'VIEWER']),
  acceptanceMode: z.enum(['REGISTER', 'LOGIN']),
  terms: z.object({ version: z.string().min(1), termsUrl: safeLink, privacyUrl: safeLink }),
})
export type Invitation = z.infer<typeof InvitationSchema>
export type InvitationRole = Invitation['role']

export const MemberSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  companyId: z.string().min(1),
  name: z.string(),
  email: z.string(),
  role: z.enum(['OWNER', 'OPERATOR', 'VIEWER']),
  status: z.enum(['ACTIVE', 'REMOVED']),
  version: z.number().int(),
  joinedAt: z.string(),
  removedAt: z.string().nullable(),
})
export type Member = z.infer<typeof MemberSchema>

export const NewUserAcceptanceSchema = z.object({
  userId: z.string().min(1),
  membership: MemberSchema,
  nextAction: z.literal('LOGIN'),
})
export type NewUserAcceptance = z.infer<typeof NewUserAcceptanceSchema>

/** Limite do BCrypt, compartilhado com o backend (C-07). */
export const PASSWORD_MAX_BYTES = 72

/** Quebras de linha recusadas pela `PasswordPolicy` do backend: LF, CR, NEL, LS e PS. */
const LINE_BREAK_CODE_POINTS = new Set([0x0a, 0x0d, 0x85, 0x2028, 0x2029])
const hasLineBreak = (value: string) =>
  [...value].some((character) => LINE_BREAK_CODE_POINTS.has(character.codePointAt(0) ?? 0))

/**
 * Política de senha do cadastro por convite, espelhando a `PasswordPolicy` do backend#74: ao menos
 * 8 unidades UTF-16 (`String.length` em Java e em JavaScript), um dígito ASCII e um caractere fora
 * de `[A-Za-z0-9]`, sem quebras de linha e com no máximo 72 bytes UTF-8.
 */
export function passwordPolicyError(password: string): string | undefined {
  if (hasLineBreak(password)) return 'A senha não pode conter quebras de linha.'
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES)
    return 'A senha excede o tamanho máximo permitido. Use uma senha mais curta.'
  if (password.length < 8 || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password))
    return 'Use ao menos 8 caracteres, um número e um caractere especial.'
  return undefined
}

export const TERMS_REQUIRED_MESSAGE = 'Aceite os termos de uso e a política de privacidade.'

export type NewUserFormData = { password: string; confirmPassword: string; termsAccepted: boolean }
export type NewUserFormErrors = Partial<Record<keyof NewUserFormData, string>>

export function validateNewUserForm(data: NewUserFormData): NewUserFormErrors {
  const errors: NewUserFormErrors = {}
  const passwordError = data.password ? passwordPolicyError(data.password) : 'Informe uma senha.'
  if (passwordError) errors.password = passwordError
  if (!data.confirmPassword) errors.confirmPassword = 'Confirme a senha.'
  else if (data.confirmPassword !== data.password)
    errors.confirmPassword = 'Senha e confirmação não coincidem.'
  if (!data.termsAccepted) errors.termsAccepted = TERMS_REQUIRED_MESSAGE
  return errors
}
