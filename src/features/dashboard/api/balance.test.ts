import { afterEach, describe, expect, it, vi } from 'vitest'

import { getBalance } from '@/features/dashboard/api/balance'
import { saveLoginToken } from '@/shared/http/authToken'
import { ApiError } from '@/shared/http/httpClient'

describe('getBalance', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('loads the authenticated balance and keeps it as a decimal string', async () => {
    saveLoginToken('login')
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ availableBalanceBrl: '485200.00' })))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getBalance()).resolves.toBe('485200.00')

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/balance',
      expect.objectContaining({ headers: { Authorization: 'Bearer login' } }),
    )
  })

  it.each([
    ['a number', { availableBalanceBrl: 485200 }],
    ['a non decimal text', { availableBalanceBrl: 'muito' }],
    ['a missing field', {}],
  ])('rejects a response with %s instead of fabricating a balance', async (_label, body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body))))

    await expect(getBalance()).rejects.toThrow()
  })

  it.each([401, 403, 404, 500])('rejects HTTP %s with an ApiError', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })))

    await expect(getBalance()).rejects.toMatchObject({ status })
    await expect(getBalance()).rejects.toBeInstanceOf(ApiError)
  })
})
