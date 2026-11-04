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

  it('sends the optional period as query parameters', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ transactedVolumeBrl: '75.30' })))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      getTransactionVolume({ startDate: '2026-10-01', endDate: '2026-10-31' }),
    ).resolves.toBe('75.30')

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/dashboard/transaction-volume?startDate=2026-10-01&endDate=2026-10-31',
      expect.anything(),
    )
  })

  it('never sends the company for the client, whose company comes from the token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ transactedVolumeBrl: '1.00' })))
    vi.stubGlobal('fetch', fetchMock)

    await getTransactionVolume({ companyId: 'other', startDate: '2026-10-01' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/dashboard/transaction-volume?startDate=2026-10-01',
      expect.anything(),
    )
  })

  it('uses the administrative route with the chosen company', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ transactedVolumeBrl: '2840000.00' })))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getTransactionVolume({ companyId: 'c1' }, undefined, true)).resolves.toBe(
      '2840000.00',
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/admin/dashboard/transaction-volume?companyId=c1',
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
