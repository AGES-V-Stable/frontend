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
  it('sends the exact mock-top-up contract with the saved login token', async () => {
    saveLoginToken('login')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ creditedAmountBrl: '10.25', availableBalanceBrl: '12.75' }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(addMockTopUp('10.25')).resolves.toEqual({
      creditedAmountBrl: '10.25',
      availableBalanceBrl: '12.75',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/balance/mock-top-ups',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ amountBrl: '10.25' }),
        headers: expect.objectContaining({ Authorization: 'Bearer login' }),
      }),
    )
  })

  it('rejects malformed mock-top-up responses without inventing a credit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ availableBalanceBrl: '12.75' }))),
    )
    await expect(addMockTopUp('10.25')).rejects.toThrow()
  })

})
