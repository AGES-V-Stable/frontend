import { httpRequest } from '@/shared/http/httpClient'
import {
  InvitationSchema,
  MemberSchema,
  NewUserAcceptanceSchema,
  type Invitation,
  type Member,
  type NewUserAcceptance,
} from '../schemas/invitation'

// Contratos C-06/C-07 (frontend#108, backend#74). O token vai sempre no body, nunca na URL.

/** Consulta pública do convite; não consome o token. */
export async function resolveInvitation(token: string, signal?: AbortSignal): Promise<Invitation> {
  return InvitationSchema.parse(
    await httpRequest<unknown>(
      '/v1/company-invitations/resolve',
      { method: 'POST', body: JSON.stringify({ token }), signal },
      false,
    ),
  )
}

export interface NewUserAcceptanceRequest {
  token: string
  password: string
  confirmPassword: string
  termsVersion: string
}

/** Cadastro público do convidado: cria identidade e vínculo, sem emitir sessão. */
export async function acceptInvitationAsNewUser(
  request: NewUserAcceptanceRequest,
  signal?: AbortSignal,
): Promise<NewUserAcceptance> {
  return NewUserAcceptanceSchema.parse(
    await httpRequest<unknown>(
      '/v1/company-invitations/accept-new-user',
      {
        method: 'POST',
        body: JSON.stringify({
          token: request.token,
          password: request.password,
          confirmPassword: request.confirmPassword,
          termsAccepted: true,
          termsVersion: request.termsVersion,
        }),
        signal,
      },
      false,
    ),
  )
}

/** Aceite pela identidade autenticada (JWT de sessão após login/2FA). */
export async function acceptInvitation(
  request: { token: string; termsVersion: string },
  signal?: AbortSignal,
): Promise<Member> {
  return MemberSchema.parse(
    await httpRequest<unknown>('/v1/company-invitations/accept', {
      method: 'POST',
      body: JSON.stringify({
        token: request.token,
        termsAccepted: true,
        termsVersion: request.termsVersion,
      }),
      signal,
    }),
  )
}
