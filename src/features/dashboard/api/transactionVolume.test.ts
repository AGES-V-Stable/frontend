import { afterEach, describe, expect, it, vi } from 'vitest'

import { getTransactionVolume } from '@/features/dashboard/api/transactionVolume'
import { saveLoginToken } from '@/shared/http/authToken'
import { ApiError } from '@/shared/http/httpClient'

describe('getTransactionVolume', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('loads the whole-history volume and keeps it as a decimal string', async () => {
    saveLoginToken('login')
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ transactedVolumeBrl: '412000.00' })))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getTransactionVolume()).resolves.toBe('412000.00')

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/dashboard/transaction-volume',
      expect.objectContaining({ headers: { Authorization: 'Bearer login' } }),
    )
  })

  it('sends the optional start date as a query parameter', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ transactedVolumeBrl: '75.30' })))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getTransactionVolume('2026-10-01')).resolves.toBe('75.30')

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/dashboard/transaction-volume?startDate=2026-10-01',
      expect.anything(),
    )
  })

  it.each([
    ['a number', { transactedVolumeBrl: 412000 }],
    ['a non decimal text', { transactedVolumeBrl: 'muito' }],
    ['a missing field', {}],
  ])('rejects a response with %s instead of fabricating a volume', async (_label, body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body))))

    await expect(getTransactionVolume()).rejects.toThrow()
  })

  it.each([400, 401, 403, 500])('rejects HTTP %s with an ApiError', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })))

    await expect(getTransactionVolume()).rejects.toMatchObject({ status })
    await expect(getTransactionVolume()).rejects.toBeInstanceOf(ApiError)
  })
})
