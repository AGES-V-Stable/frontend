import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getTransactionVolume } from '@/features/dashboard/api/transactionVolume'
import { useTransactionVolume } from '@/features/dashboard/hooks/useTransactionVolume'
import type { DashboardFilters } from '@/features/dashboard/types/dashboardFilters'
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
    expect(getVolumeMock).toHaveBeenCalledWith(
      { startDate: undefined, endDate: undefined, companyId: undefined },
      expect.any(AbortSignal),
      false,
    )
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

  it('reloads when the period, the company or the scope changes', async () => {
    getVolumeMock
      .mockResolvedValueOnce('300.50')
      .mockResolvedValueOnce('200.00')
      .mockResolvedValueOnce('900.00')

    const { result, rerender } = renderHook(
      ({ filters, admin }) => useTransactionVolume(filters, admin),
      { initialProps: { filters: {} as DashboardFilters, admin: false } },
    )
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', volume: '300.50' }))

    rerender({ filters: { startDate: '2026-10-01', endDate: '2026-10-31' }, admin: false })

    expect(result.current.state).toEqual({ status: 'loading' })
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', volume: '200.00' }))
    expect(getVolumeMock).toHaveBeenLastCalledWith(
      { startDate: '2026-10-01', endDate: '2026-10-31', companyId: undefined },
      expect.any(AbortSignal),
      false,
    )

    rerender({ filters: { companyId: 'c1' }, admin: true })

    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', volume: '900.00' }))
    expect(getVolumeMock).toHaveBeenLastCalledWith(
      { startDate: undefined, endDate: undefined, companyId: 'c1' },
      expect.any(AbortSignal),
      true,
    )
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
