import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getExchangeRates } from '@/features/dashboard/api/exchangeRates'
import { useExchangeRates } from '@/features/dashboard/hooks/useExchangeRates'
import type { ExchangeRate } from '@/features/dashboard/types/exchangeRates'
import { ApiError } from '@/shared/http/httpClient'

vi.mock('@/features/dashboard/api/exchangeRates', () => ({ getExchangeRates: vi.fn() }))

const getExchangeRatesMock = vi.mocked(getExchangeRates)
const rates: ExchangeRate[] = [
  {
    baseCurrency: 'BRL',
    quoteCurrency: 'USDC',
    rate: '5.47000000',
    fetchedAt: '2026-11-12T22:45:00Z',
    status: 'CURRENT',
  },
]

describe('useExchangeRates', () => {
  beforeEach(() => {
    getExchangeRatesMock.mockReset()
  })

  it('starts loading and then exposes the rates, requesting them only once', async () => {
    getExchangeRatesMock.mockResolvedValue(rates)

    const { result } = renderHook(() => useExchangeRates())

    expect(result.current.state).toEqual({ status: 'loading' })
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', rates }))
    expect(getExchangeRatesMock).toHaveBeenCalledTimes(1)
  })

  it('shows an error and loads again on retry', async () => {
    getExchangeRatesMock
      .mockRejectedValueOnce(new ApiError(500, 'boom'))
      .mockResolvedValueOnce(rates)

    const { result } = renderHook(() => useExchangeRates())
    await waitFor(() => expect(result.current.state.status).toBe('error'))
    expect(result.current.state).toMatchObject({
      message: expect.stringContaining('Não foi possível carregar as cotações'),
    })

    act(() => result.current.retry())

    expect(result.current.state).toEqual({ status: 'loading' })
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', rates }))
    expect(getExchangeRatesMock).toHaveBeenCalledTimes(2)
  })

  it('aborts the pending request when the component unmounts', () => {
    getExchangeRatesMock.mockReturnValue(new Promise(() => undefined))

    const { unmount } = renderHook(() => useExchangeRates())
    const signal = getExchangeRatesMock.mock.calls[0][0] as AbortSignal

    unmount()

    expect(signal.aborted).toBe(true)
  })

  it('ignores the failure of a request aborted by unmounting', async () => {
    let reject: (reason: unknown) => void = () => undefined
    getExchangeRatesMock.mockReturnValue(new Promise((_resolve, fail) => (reject = fail)))

    const { result, unmount } = renderHook(() => useExchangeRates())
    unmount()
    reject(new DOMException('aborted', 'AbortError'))
    await Promise.resolve()

    expect(result.current.state).toEqual({ status: 'loading' })
  })
})
