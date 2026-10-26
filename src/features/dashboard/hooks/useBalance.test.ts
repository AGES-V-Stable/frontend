import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getBalance } from '@/features/dashboard/api/balance'
import { useBalance } from '@/features/dashboard/hooks/useBalance'
import { ApiError } from '@/shared/http/httpClient'

vi.mock('@/features/dashboard/api/balance', () => ({ getBalance: vi.fn() }))

const getBalanceMock = vi.mocked(getBalance)

describe('useBalance', () => {
  beforeEach(() => {
    getBalanceMock.mockReset()
  })

  it('starts loading and then exposes the company balance', async () => {
    getBalanceMock.mockResolvedValue('485200.00')

    const { result } = renderHook(() => useBalance())

    expect(result.current.state).toEqual({ status: 'loading' })
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'ready', balance: '485200.00' }),
    )
  })

  it('keeps a zero balance visible instead of hiding it', async () => {
    getBalanceMock.mockResolvedValue('0.00')

    const { result } = renderHook(() => useBalance())

    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', balance: '0.00' }))
  })

  it('explains the missing company access when the API answers 403', async () => {
    getBalanceMock.mockRejectedValue(new ApiError(403, 'forbidden', 'FORBIDDEN'))

    const { result } = renderHook(() => useBalance())

    await waitFor(() => expect(result.current.state.status).toBe('error'))
    expect(result.current.state).toMatchObject({
      message: expect.stringContaining('não possui acesso a uma empresa'),
    })
  })

  it('shows a generic error and recovers on retry', async () => {
    getBalanceMock.mockRejectedValueOnce(new ApiError(500, 'boom')).mockResolvedValueOnce('12.75')

    const { result } = renderHook(() => useBalance())
    await waitFor(() => expect(result.current.state.status).toBe('error'))
    expect(result.current.state).toMatchObject({
      message: expect.stringContaining('Não foi possível carregar'),
    })

    act(() => result.current.retry())

    expect(result.current.state).toEqual({ status: 'loading' })
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', balance: '12.75' }))
    expect(getBalanceMock).toHaveBeenCalledTimes(2)
  })

  it('aborts the pending request when the component unmounts', () => {
    getBalanceMock.mockReturnValue(new Promise(() => undefined))

    const { unmount } = renderHook(() => useBalance())
    const signal = getBalanceMock.mock.calls[0][0] as AbortSignal
    expect(signal.aborted).toBe(false)

    unmount()

    expect(signal.aborted).toBe(true)
  })
})
