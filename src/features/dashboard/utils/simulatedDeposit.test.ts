import { describe, expect, it } from 'vitest'

import type { User } from '@/features/auth'
import {
  canAddSimulatedBalance,
  describeSimulatedDepositError,
  normalizeDepositAmount,
} from '@/features/dashboard/utils/simulatedDeposit'
import { ApiError, HttpError } from '@/shared/http/httpClient'

type Access = NonNullable<User['companyAccess']>
const user = (access: Partial<Access> | null, companyId: string | null = 'c1'): User => ({
  id: 'u1',
  name: 'Ana',
  email: 'ana@empresa.test',
  companyId,
  accountType: 'USER',
  roles: [],
  companyAccess:
    access === null
      ? null
      : {
          membershipId: 'm1',
          companyId: 'c1',
          role: 'OWNER',
          status: 'ACTIVE',
          permissions: [],
          version: 1,
          ...access,
        },
})

describe('canAddSimulatedBalance', () => {
  it('allows the active owner of the session company', () => {
    expect(canAddSimulatedBalance(user({}))).toBe(true)
  })

  it.each([
    ['without session', null],
    ['an operator', user({ role: 'OPERATOR' })],
    ['a viewer', user({ role: 'VIEWER' })],
    ['a removed owner', user({ status: 'REMOVED' })],
    ['an owner of another company', user({ companyId: 'c2' })],
    ['a user without company', user(null, null)],
  ])('denies %s', (_label, candidate) => {
    expect(canAddSimulatedBalance(candidate)).toBe(false)
  })
})

describe('normalizeDepositAmount', () => {
  it.each([
    ['20,50', '20.50'],
    [' 20.5 ', '20.5'],
    ['100', '100'],
    ['0,01', '0.01'],
  ])('accepts %s as %s', (text, expected) => {
    expect(normalizeDepositAmount(text)).toBe(expected)
  })

  it.each(['', '0', '0,00', '-5', '1,234', '1.234,56', 'abc', '12345678901234'])(
    'rejects %s',
    (text) => {
      expect(normalizeDepositAmount(text)).toBeNull()
    },
  )
})

describe('describeSimulatedDepositError', () => {
  const httpError = (status: number, code?: string) => new HttpError('x', status, {}, code)

  it.each([
    [403, 'KYC_NOT_APPROVED', 'Conclua a verificação de identidade para adicionar saldo.'],
    [409, 'BALANCE_LIMIT_EXCEEDED', 'acima do limite permitido'],
    [404, 'SIMULATED_DEPOSITS_DISABLED', 'não está disponível neste ambiente'],
    [403, 'OWNER_REQUIRED', 'Somente o proprietário da empresa pode adicionar saldo.'],
    [400, 'VALIDATION_ERROR', 'Informe um valor positivo com até duas casas decimais.'],
    [500, undefined, 'Não foi possível confirmar a adição de saldo simulado.'],
  ])('given %s %s, then it explains the reason', (status, code, expected) => {
    expect(describeSimulatedDepositError(httpError(status, code))).toContain(expected)
  })

  it('explains a connection failure', () => {
    expect(describeSimulatedDepositError(new ApiError(0, 'offline', 'NETWORK_ERROR'))).toContain(
      'conectar ao servidor',
    )
  })

  it('does not mistake a prototype key for a known code', () => {
    expect(describeSimulatedDepositError(httpError(409, 'constructor'))).toContain(
      'Não foi possível confirmar',
    )
  })

  it('falls back for an unexpected error', () => {
    expect(describeSimulatedDepositError(new Error('boom'))).toContain('Não foi possível confirmar')
  })
})
