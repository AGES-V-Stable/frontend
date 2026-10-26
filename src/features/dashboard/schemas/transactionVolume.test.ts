import { describe, expect, it } from 'vitest'

import { TransactionVolumeSchema } from '@/features/dashboard/schemas/transactionVolume'

describe('TransactionVolumeSchema', () => {
  it.each(['0.00', '412000.00', '10', '-5.50'])('accepts the decimal string %s', (value) => {
    expect(TransactionVolumeSchema.parse({ transactedVolumeBrl: value })).toEqual({
      transactedVolumeBrl: value,
    })
  })

  it.each([
    ['a number', { transactedVolumeBrl: 412000 }],
    ['a non decimal text', { transactedVolumeBrl: 'muito' }],
    ['a formatted amount', { transactedVolumeBrl: 'R$ 412.000,00' }],
    ['a missing field', {}],
    ['null', { transactedVolumeBrl: null }],
  ])('rejects %s instead of fabricating a volume', (_label, body) => {
    expect(() => TransactionVolumeSchema.parse(body)).toThrow()
  })
})
