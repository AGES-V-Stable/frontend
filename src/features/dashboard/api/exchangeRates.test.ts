import { afterEach, describe, expect, it, vi } from 'vitest'

import { getExchangeRates } from '@/features/dashboard/api/exchangeRates'
import { saveLoginToken } from '@/shared/http/authToken'
import { ApiError } from '@/shared/http/httpClient'

const rates = [
  {
    baseCurrency: 'BRL',
    quoteCurrency: 'USDC',
    rate: '5.47000000',
    fetchedAt: '2026-11-12T22:45:00Z',
    status: 'CURRENT',
  },
]

describe('getExchangeRates', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('loads the rates from the full path with the session token', async () => {
    saveLoginToken('login')
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ rates, ttlSeconds: 7200 })))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getExchangeRates()).resolves.toEqual(rates)

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/exchange-rates',
      expect.objectContaining({ headers: { Authorization: 'Bearer login' } }),
    )
  })

  it('rejects a response outside the contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ rates: [{ rate: 5.47 }] }))),
    )

    await expect(getExchangeRates()).rejects.toThrow()
  })

  it.each([401, 500])('rejects HTTP %s with an ApiError', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })))

    await expect(getExchangeRates()).rejects.toBeInstanceOf(ApiError)
  })
})
