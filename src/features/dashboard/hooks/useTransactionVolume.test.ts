import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getTransactionVolume } from '@/features/dashboard/api/transactionVolume'
import { useTransactionVolume } from '@/features/dashboard/hooks/useTransactionVolume'
import { ApiError } from '@/shared/http/httpClient'

vi.mock('@/features/dashboard/api/transactionVolume', () => ({ getTransactionVolume: vi.fn() }))

const getVolumeMock = vi.mocked(getTransactionVolume)

describe('useTransactionVolume', () => {
  beforeEach(() => {
    getVolumeMock.mockReset()
  })

  it('starts loading and then exposes the volume of the whole history', async () => {
    getVolumeMock.mockResolvedValue('412000.00')

    const { result } = renderHook(() => useTransactionVolume())

    expect(result.current.state).toEqual({ status: 'loading' })
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'ready', volume: '412000.00' }),
    )
    expect(getVolumeMock).toHaveBeenCalledWith(undefined, expect.any(AbortSignal))
  })

  it('keeps a zero volume visible instead of hiding it', async () => {
    getVolumeMock.mockResolvedValue('0.00')

    const { result } = renderHook(() => useTransactionVolume())

    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', volume: '0.00' }))
  })

  it('explains the missing company access when the API answers 403', async () => {
    getVolumeMock.mockRejectedValue(new ApiError(403, 'forbidden', 'FORBIDDEN'))

    const { result } = renderHook(() => useTransactionVolume())

    await waitFor(() => expect(result.current.state.status).toBe('error'))
    expect(result.current.state).toMatchObject({
      message: expect.stringContaining('não possui acesso a uma empresa'),
    })
  })

  it('shows a generic error and recovers on retry', async () => {
    getVolumeMock.mockRejectedValueOnce(new ApiError(500, 'boom')).mockResolvedValueOnce('12.75')

    const { result } = renderHook(() => useTransactionVolume())
    await waitFor(() => expect(result.current.state.status).toBe('error'))
    expect(result.current.state).toMatchObject({
      message: expect.stringContaining('Não foi possível carregar'),
    })

    act(() => result.current.retry())

    expect(result.current.state).toEqual({ status: 'loading' })
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', volume: '12.75' }))
    expect(getVolumeMock).toHaveBeenCalledTimes(2)
  })

  it('reloads with the new start date when it changes', async () => {
    getVolumeMock.mockResolvedValueOnce('300.50').mockResolvedValueOnce('200.00')

    const { result, rerender } = renderHook(({ start }) => useTransactionVolume(start), {
      initialProps: { start: undefined as string | undefined },
    })
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', volume: '300.50' }))

    rerender({ start: '2026-10-01' })

    expect(result.current.state).toEqual({ status: 'loading' })
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', volume: '200.00' }))
    expect(getVolumeMock).toHaveBeenLastCalledWith('2026-10-01', expect.any(AbortSignal))
  })

  it('aborts the pending request when the component unmounts', () => {
    getVolumeMock.mockReturnValue(new Promise(() => undefined))

    const { unmount } = renderHook(() => useTransactionVolume())
    const signal = getVolumeMock.mock.calls[0][1] as AbortSignal
    expect(signal.aborted).toBe(false)

    unmount()

    expect(signal.aborted).toBe(true)
  })
})
