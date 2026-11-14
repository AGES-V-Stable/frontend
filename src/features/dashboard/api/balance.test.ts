import { afterEach, describe, expect, it, vi } from 'vitest'

import { addMockTopUp, addSimulatedBalance, getBalance } from '@/features/dashboard/api/balance'
import { saveLoginToken } from '@/shared/http/authToken'
import { ApiError } from '@/shared/http/httpClient'

describe('balance API', () => {
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

  it('sends a fresh idempotency key with every mock credit request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ creditedAmountBrl: '10.25', availableBalanceBrl: '12.75' })),
    )
    vi.stubGlobal('fetch', fetchMock)
    const randomUUID = vi.fn()
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000001')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000002')
    vi.stubGlobal('crypto', { randomUUID })

    await expect(addMockTopUp('10.25')).resolves.toEqual({
      creditedAmountBrl: '10.25',
      availableBalanceBrl: '12.75',
    })
    await addMockTopUp('10.25')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe('/v1/balance/mock-top-ups')
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ amountBrl: '10.25' }),
      headers: expect.objectContaining({
        'Idempotency-Key': '00000000-0000-4000-8000-000000000001',
      }),
    }))
    expect(fetchMock.mock.calls[1][1].headers['Idempotency-Key'])
      .toBe('00000000-0000-4000-8000-000000000002')
    expect(randomUUID).toHaveBeenCalledTimes(2)
  })

  it('posts the simulated deposit and returns the updated balance', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ availableBalanceBrl: '120.50' })))
    vi.stubGlobal('fetch', fetchMock)

    await expect(addSimulatedBalance('20.50')).resolves.toBe('120.50')

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/balance/simulated-deposits',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ amount: '20.50' }),
      }),
    )
  })
})
