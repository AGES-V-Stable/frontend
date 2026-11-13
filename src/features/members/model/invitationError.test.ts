import { describe, expect, it } from 'vitest'
import { ApiError, HttpError } from '@/shared/http/httpClient'
import { describeInvitationError, existingInvitationId, formatWait } from './invitationError'

const httpError = (status: number, code?: string, body?: unknown, retryAfter?: number) =>
  new HttpError('Mensagem do servidor', status, body, code, retryAfter)

describe('describeInvitationError', () => {
  it.each([
    ['MEMBER_ALREADY_EXISTS', 'Este e-mail já pertence a um membro desta empresa.'],
    [
      'USER_IN_OTHER_COMPANY',
      'Este e-mail já está vinculado a outra empresa e não pode receber o convite.',
    ],
    ['EMAIL_RESERVED', 'Este e-mail não pode receber um convite.'],
  ])('given %s on create, then it points to the e-mail field', (code, message) => {
    expect(describeInvitationError(httpError(409, code), 'create')).toEqual({
      message,
      stale: false,
      field: 'email',
    })
  })

  it.each([
    ['INVITATION_ALREADY_USED', 409, 'link'],
    ['INVITATION_REVOKED', 410, 'link'],
    ['INVITATION_NOT_FOUND', 404, 'revoke'],
    ['INVITATION_NOT_REGENERABLE', 409, 'regenerate'],
    ['RESOURCE_VERSION_MISMATCH', 412, 'regenerate'],
    ['INVITATION_ALREADY_USED', 409, 'revoke'],
  ] as const)('given %s (%i) on %s, then the list must be reloaded', (code, status, action) => {
    expect(describeInvitationError(httpError(status, code), action).stale).toBe(true)
  })

  it('given a rate-limited regeneration, then it tells how long to wait from Retry-After', () => {
    const failure = describeInvitationError(
      httpError(429, 'INVITATION_RATE_LIMITED', undefined, 45),
      'regenerate',
    )
    expect(failure).toEqual({
      message: 'Aguarde 45 segundos para gerar um novo link deste convite.',
      stale: false,
    })
  })

  it('given a 429 without Retry-After, then it shows a generic wait message', () => {
    expect(describeInvitationError(httpError(429, 'RATE_LIMITED'), 'link').message).toBe(
      'Muitas tentativas. Aguarde um momento e tente novamente.',
    )
  })

  it.each([
    [httpError(403, 'OWNER_REQUIRED')],
    [httpError(403)],
    [new ApiError(409, 'x', 'COMPANY_ACCESS_REVOKED')],
  ])('given a permission failure, then it explains the owner-only access', (error) => {
    expect(describeInvitationError(error, 'revoke')).toEqual({
      message: 'Você não tem permissão para gerenciar convites desta empresa.',
      stale: false,
    })
  })

  it('given a validation error on create, then it asks to review the fields', () => {
    expect(describeInvitationError(httpError(400, 'VALIDATION_ERROR'), 'create').message).toBe(
      'Revise o nome, o e-mail e o perfil informados.',
    )
  })

  it('given a network failure, then it asks to try again', () => {
    expect(describeInvitationError(httpError(0, 'NETWORK_ERROR'), 'regenerate').message).toBe(
      'Não foi possível conectar ao servidor. Tente novamente.',
    )
  })

  it.each([
    ['create', 'Não foi possível criar o convite. Tente novamente.'],
    ['link', 'Não foi possível obter o link do convite. Tente novamente.'],
    ['regenerate', 'Não foi possível gerar um novo link. Tente novamente.'],
    ['revoke', 'Não foi possível revogar o convite. Tente novamente.'],
  ] as const)(
    'given an unexpected failure on %s, then it uses the action fallback',
    (action, message) => {
      expect(describeInvitationError(new Error('boom'), action)).toEqual({ message, stale: false })
      expect(describeInvitationError(httpError(500, 'INTERNAL_ERROR'), action).message).toBe(
        message,
      )
    },
  )

  it('never decides by the server message text', () => {
    const error = new HttpError('Esta pessoa já é membro desta empresa.', 500, undefined, 'X')
    expect(describeInvitationError(error, 'create').field).toBeUndefined()
  })
})

describe('existingInvitationId', () => {
  it('reads details.invitationId of INVITATION_ALREADY_EXISTS', () => {
    const error = httpError(409, 'INVITATION_ALREADY_EXISTS', { details: { invitationId: 'i-9' } })
    expect(existingInvitationId(error)).toBe('i-9')
  })

  it.each([
    [httpError(409, 'INVITATION_ALREADY_EXISTS', { details: {} })],
    [httpError(409, 'MEMBER_ALREADY_EXISTS', { details: { invitationId: 'i-9' } })],
    [new Error('x')],
  ])('returns null without a valid id for a duplicate invitation', (error) => {
    expect(existingInvitationId(error)).toBeNull()
  })
})

describe('formatWait', () => {
  it.each([
    [1, '1 segundo'],
    [45, '45 segundos'],
    [60, '1 minuto'],
    [61, '2 minutos'],
    [3600, '60 minutos'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatWait(seconds)).toBe(expected)
  })
})
