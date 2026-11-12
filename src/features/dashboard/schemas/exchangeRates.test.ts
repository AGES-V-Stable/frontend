import { describe, expect, it } from 'vitest'

import { ExchangeRatesSchema } from '@/features/dashboard/schemas/exchangeRates'

const current = {
  baseCurrency: 'BRL',
  quoteCurrency: 'USDC',
  rate: '5.47000000',
  fetchedAt: '2026-11-12T22:45:00Z',
  status: 'CURRENT',
}
const unavailable = {
  baseCurrency: 'BRL',
  quoteCurrency: 'USDT',
  rate: null,
  fetchedAt: null,
  status: 'UNAVAILABLE',
}

describe('ExchangeRatesSchema', () => {
  it('accepts current, stale and unavailable rates keeping the rate as a decimal string', () => {
    const body = {
      rates: [
        current,
        {
          ...current,
          quoteCurrency: 'USDCe',
          status: 'STALE',
          fetchedAt: '2026-11-12T19:45:00.123456-03:00',
        },
        unavailable,
      ],
      ttlSeconds: 7200,
    }

    expect(ExchangeRatesSchema.parse(body)).toEqual(body)
  })

  it('accepts an empty list of pairs', () => {
    expect(ExchangeRatesSchema.parse({ rates: [], ttlSeconds: 7200 }).rates).toEqual([])
  })

  it.each([
    ['a numeric rate', { ...current, rate: 5.47 }],
    ['a formatted rate', { ...current, rate: 'R$ 5,47' }],
    ['a negative rate', { ...current, rate: '-5.47' }],
    ['an available rate without value', { ...current, rate: null }],
    ['an available rate without date', { ...current, fetchedAt: null }],
    ['an invalid date', { ...current, fetchedAt: 'ontem' }],
    ['an unavailable rate with a number', { ...unavailable, rate: '5.40' }],
    ['an unavailable rate with a date', { ...unavailable, fetchedAt: '2026-11-12T22:45:00Z' }],
    ['an unknown status', { ...current, status: 'EXPIRED' }],
    ['a missing currency', { ...current, baseCurrency: undefined }],
    ['a lowercase currency', { ...current, baseCurrency: 'brl' }],
  ])('rejects %s instead of showing it as a quote', (_label, rate) => {
    expect(() => ExchangeRatesSchema.parse({ rates: [rate], ttlSeconds: 7200 })).toThrow()
  })

  it('rejects a response without ttlSeconds', () => {
    expect(() => ExchangeRatesSchema.parse({ rates: [current] })).toThrow()
  })
})
