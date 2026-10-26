import { describe, expect, it } from 'vitest'

import { BalanceSchema } from '@/features/dashboard/schemas/balance'

describe('BalanceSchema', () => {
  it.each(['0.00', '485200.00', '10', '-5.50'])('accepts the decimal string %s', (value) => {
    expect(BalanceSchema.parse({ availableBalanceBrl: value })).toEqual({
      availableBalanceBrl: value,
    })
  })

  it.each([
    ['a number', { availableBalanceBrl: 485200 }],
    ['a non decimal text', { availableBalanceBrl: 'muito' }],
    ['a formatted amount', { availableBalanceBrl: 'R$ 485.200,00' }],
    ['a missing field', {}],
    ['null', { availableBalanceBrl: null }],
  ])('rejects %s instead of fabricating a balance', (_label, body) => {
    expect(() => BalanceSchema.parse(body)).toThrow()
  })
})
