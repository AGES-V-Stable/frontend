import { describe, expect, it } from 'vitest'
import { ApiError, HttpError } from '@/shared/http/httpClient'
import {
  classifyInvitationError,
  DEFAULT_RETRY_AFTER_SECONDS,
  isTerminalTokenFailure,
} from './invitationFailure'

const httpError = (status: number, code?: string, body?: unknown, retryAfter?: number) =>
  new HttpError('Mensagem do backend.', status, body, code, retryAfter)

describe('classifyInvitationError', () => {
  it.each([
    [404, 'INVITATION_INVALID', 'INVALID'],
    [404, 'INVITATION_NOT_FOUND', 'INVALID'],
    [410, 'INVITATION_SUPERSEDED', 'SUPERSEDED'],
    [410, 'INVITATION_REVOKED', 'REVOKED'],
    [409, 'INVITATION_ALREADY_USED', 'ALREADY_USED'],
    [403, 'INVITATION_IDENTITY_MISMATCH', 'IDENTITY_MISMATCH'],
    [409, 'USER_ALREADY_EXISTS', 'USER_ALREADY_EXISTS'],
    [409, 'USER_IN_OTHER_COMPANY', 'USER_IN_OTHER_COMPANY'],
    [409, 'MEMBER_ALREADY_EXISTS', 'MEMBER_ALREADY_EXISTS'],
    [409, 'TERMS_VERSION_MISMATCH', 'TERMS_VERSION_MISMATCH'],
  ])('maps HTTP %i %s to %s by code', (status, code, kind) => {
    expect(classifyInvitationError(httpError(status, code))).toEqual({ kind })
  })

  it('decides by code, never by the message text', () => {
    const error = new ApiError(409, 'Convite revogado', 'INVITATION_ALREADY_USED')
    expect(classifyInvitationError(error)).toEqual({ kind: 'ALREADY_USED' })
  })

  it('respects Retry-After on 429 and falls back to a default wait', () => {
    expect(classifyInvitationError(httpError(429, 'RATE_LIMITED', undefined, 12))).toEqual({
      kind: 'RATE_LIMITED',
      retryAfterSeconds: 12,
    })
    expect(classifyInvitationError(httpError(429, 'INVITATION_RATE_LIMITED'))).toEqual({
      kind: 'RATE_LIMITED',
      retryAfterSeconds: DEFAULT_RETRY_AFTER_SECONDS,
    })
    expect(classifyInvitationError(new ApiError(429, 'x'))).toMatchObject({ kind: 'RATE_LIMITED' })
  })

  it.each([
    ['PASSWORD_TOO_WEAK', 'password'],
    ['PASSWORD_CONFIRMATION_MISMATCH', 'confirmPassword'],
    ['TERMS_NOT_ACCEPTED', 'termsAccepted'],
  ])('points %s to the %s field with the presentable backend message', (code, field) => {
    expect(classifyInvitationError(httpError(422, code))).toEqual({
      kind: 'VALIDATION',
      fieldErrors: { [field]: 'Mensagem do backend.' },
    })
  })

  it('maps known fieldErrors of a validation error and ignores unknown fields', () => {
    const body = {
      code: 'VALIDATION_ERROR',
      fieldErrors: [
        { field: 'password', message: 'Senha inválida.' },
        { field: 'email', message: 'Não permitido.' },
      ],
    }
    expect(classifyInvitationError(httpError(400, 'VALIDATION_ERROR', body))).toEqual({
      kind: 'VALIDATION',
      fieldErrors: { password: 'Senha inválida.' },
    })
    expect(classifyInvitationError(httpError(400, 'MALFORMED_PAYLOAD', {}))).toEqual({
      kind: 'UNAVAILABLE',
    })
  })

  it.each([
    [new ApiError(401, 'x', 'TOKEN_EXPIRED'), 'UNAUTHENTICATED'],
    [new ApiError(403, 'x', 'PERMISSION_DENIED'), 'FORBIDDEN'],
    [new ApiError(404, 'x'), 'INVALID'],
    [new ApiError(500, 'x', 'INTERNAL_ERROR'), 'UNAVAILABLE'],
    [new ApiError(0, 'x', 'NETWORK_ERROR'), 'UNAVAILABLE'],
    [new Error('schema mismatch'), 'UNAVAILABLE'],
  ])('maps %o to %s', (error, kind) => {
    expect(classifyInvitationError(error)).toEqual({ kind })
  })
})

describe('isTerminalTokenFailure', () => {
  it('discards the token only when the link no longer works', () => {
    for (const kind of ['INVALID', 'SUPERSEDED', 'REVOKED', 'ALREADY_USED'] as const)
      expect(isTerminalTokenFailure({ kind })).toBe(true)
    for (const kind of ['UNAVAILABLE', 'IDENTITY_MISMATCH', 'USER_ALREADY_EXISTS'] as const)
      expect(isTerminalTokenFailure({ kind })).toBe(false)
  })
})
