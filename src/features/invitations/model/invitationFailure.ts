import { z } from 'zod'
import { ApiError, HttpError } from '@/shared/http/httpClient'
import type { NewUserFormErrors } from '../schemas/invitation'

/** Espera usada quando um 429 não informa `Retry-After`. */
export const DEFAULT_RETRY_AFTER_SECONDS = 30

export type InvitationFailure =
  | {
      kind:
        | 'INVALID'
        | 'SUPERSEDED'
        | 'REVOKED'
        | 'ALREADY_USED'
        | 'IDENTITY_MISMATCH'
        | 'USER_ALREADY_EXISTS'
        | 'USER_IN_OTHER_COMPANY'
        | 'MEMBER_ALREADY_EXISTS'
        | 'TERMS_VERSION_MISMATCH'
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'UNAVAILABLE'
    }
  | { kind: 'RATE_LIMITED'; retryAfterSeconds: number }
  | { kind: 'VALIDATION'; fieldErrors: NewUserFormErrors }

/** Falhas em que o link não serve mais: o token é descartado do armazenamento da aba. */
export const isTerminalTokenFailure = (failure: InvitationFailure) =>
  failure.kind === 'INVALID' ||
  failure.kind === 'SUPERSEDED' ||
  failure.kind === 'REVOKED' ||
  failure.kind === 'ALREADY_USED'

const DIRECT_CODES: Record<
  string,
  Exclude<InvitationFailure['kind'], 'RATE_LIMITED' | 'VALIDATION'>
> = {
  INVITATION_INVALID: 'INVALID',
  INVITATION_NOT_FOUND: 'INVALID',
  INVITATION_SUPERSEDED: 'SUPERSEDED',
  INVITATION_REVOKED: 'REVOKED',
  INVITATION_ALREADY_USED: 'ALREADY_USED',
  INVITATION_IDENTITY_MISMATCH: 'IDENTITY_MISMATCH',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_IN_OTHER_COMPANY: 'USER_IN_OTHER_COMPANY',
  MEMBER_ALREADY_EXISTS: 'MEMBER_ALREADY_EXISTS',
  TERMS_VERSION_MISMATCH: 'TERMS_VERSION_MISMATCH',
}

const FIELD_CODES: Record<string, keyof NewUserFormErrors> = {
  PASSWORD_TOO_WEAK: 'password',
  PASSWORD_CONFIRMATION_MISMATCH: 'confirmPassword',
  TERMS_NOT_ACCEPTED: 'termsAccepted',
}

const FALLBACK_FIELD_MESSAGES: Record<keyof NewUserFormErrors, string> = {
  password: 'A senha não atende aos requisitos.',
  confirmPassword: 'Senha e confirmação não coincidem.',
  termsAccepted: 'Aceite os termos de uso e a política de privacidade.',
}

const FieldErrorsSchema = z.object({
  fieldErrors: z.array(z.object({ field: z.string(), message: z.string().min(1) })),
})

function isFormField(field: string): field is keyof NewUserFormErrors {
  return field in FALLBACK_FIELD_MESSAGES
}

/** Campos do formulário apontados pelo backend; o restante cai na mensagem genérica do campo. */
function fieldErrorsFrom(error: ApiError): NewUserFormErrors {
  const field = error.code ? FIELD_CODES[error.code] : undefined
  if (field) return { [field]: error.message || FALLBACK_FIELD_MESSAGES[field] }
  const parsed = FieldErrorsSchema.safeParse(error.body)
  const errors: NewUserFormErrors = {}
  for (const item of parsed.success ? parsed.data.fieldErrors : [])
    if (isFormField(item.field) && !errors[item.field]) errors[item.field] = item.message
  return errors
}

/** Decide o tratamento pelo `code` do contrato (nunca pela mensagem) e, sem ele, pelo status. */
export function classifyInvitationError(error: unknown): InvitationFailure {
  if (!(error instanceof ApiError)) return { kind: 'UNAVAILABLE' }
  const direct = error.code ? DIRECT_CODES[error.code] : undefined
  if (direct) return { kind: direct }
  if (
    error.status === 429 ||
    error.code === 'RATE_LIMITED' ||
    error.code === 'INVITATION_RATE_LIMITED'
  )
    return {
      kind: 'RATE_LIMITED',
      retryAfterSeconds:
        (error instanceof HttpError ? error.retryAfterSeconds : undefined) ??
        DEFAULT_RETRY_AFTER_SECONDS,
    }
  if (error.status === 400 || error.status === 422) {
    const fieldErrors = fieldErrorsFrom(error)
    return Object.keys(fieldErrors).length > 0
      ? { kind: 'VALIDATION', fieldErrors }
      : { kind: 'UNAVAILABLE' }
  }
  if (error.status === 401) return { kind: 'UNAUTHENTICATED' }
  if (error.status === 403) return { kind: 'FORBIDDEN' }
  if (error.status === 404) return { kind: 'INVALID' }
  return { kind: 'UNAVAILABLE' }
}
