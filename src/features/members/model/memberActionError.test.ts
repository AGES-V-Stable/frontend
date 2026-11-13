import { describe, expect, it } from 'vitest'
import { HttpError } from '@/shared/http/httpClient'
import { describeMemberActionError } from './memberActionError'

const apiError = (status: number, code?: string) =>
  new HttpError('Mensagem do servidor', status, undefined, code)

describe('describeMemberActionError', () => {
  it.each([
    [412, 'RESOURCE_VERSION_MISMATCH', 'alterado em outra sessão'],
    [404, 'MEMBER_NOT_FOUND', 'não faz mais parte da empresa'],
    [409, 'MEMBERSHIP_NOT_ACTIVE', 'não faz mais parte da empresa'],
    [409, 'OWNER_PROTECTED', 'proprietário da empresa não pode'],
  ])('given %s %s, then it asks to reload the list', (status, code, text) => {
    const failure = describeMemberActionError(apiError(status, code), 'update')
    expect(failure.stale).toBe(true)
    expect(failure.message).toContain(text)
  })

  it.each([
    [403, 'OWNER_REQUIRED'],
    [403, 'COMPANY_ACCESS_REVOKED'],
    [403, undefined],
  ])(
    'given a forbidden response (%s %s), then it explains the missing permission',
    (status, code) => {
      expect(describeMemberActionError(apiError(status, code), 'remove')).toEqual({
        message: 'Você não tem permissão para gerenciar membros desta empresa.',
        stale: false,
      })
    },
  )

  it('given a rate limit, then it asks to wait without reloading', () => {
    expect(describeMemberActionError(apiError(429, 'RATE_LIMITED'), 'update')).toEqual({
      message: 'Muitas tentativas. Aguarde um momento e tente novamente.',
      stale: false,
    })
  })

  it('given a network failure, then it allows a new attempt', () => {
    expect(describeMemberActionError(apiError(0, 'NETWORK_ERROR'), 'remove').message).toBe(
      'Não foi possível conectar ao servidor. Tente novamente.',
    )
  })

  it('given an unexpected failure, then it uses the message of the action and never the server text', () => {
    expect(describeMemberActionError(apiError(500, 'INTERNAL_ERROR'), 'update')).toEqual({
      message: 'Não foi possível salvar as alterações. Tente novamente.',
      stale: false,
    })
    expect(describeMemberActionError(new Error('boom'), 'remove')).toEqual({
      message: 'Não foi possível remover o acesso. Tente novamente.',
      stale: false,
    })
  })
})
