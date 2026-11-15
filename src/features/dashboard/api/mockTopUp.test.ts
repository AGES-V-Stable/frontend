import { afterEach, describe, expect, it, vi } from 'vitest'
import { addMockTopUp } from './balance'
import { saveLoginToken } from '@/shared/http/authToken'

describe('mock top-up API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('posts amountBrl as a decimal string and validates the resulting balance', async () => {
    saveLoginToken('login')
    const response = { creditedAmountBrl: '10.25', availableBalanceBrl: '12.75' }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response)))
    vi.stubGlobal('fetch', fetchMock)

    await expect(addMockTopUp('10.25')).resolves.toEqual(response)
    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/balance/mock-top-ups',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ amountBrl: '10.25' }),
        headers: expect.objectContaining({ Authorization: 'Bearer login' }),
      }),
    )
  })

  it('rejects missing credited amount instead of fabricating a successful top-up', async () => {
    const response = { availableBalanceBrl: '12.75' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(response))))

    await expect(addMockTopUp('10.25')).rejects.toThrow()
  })
})
