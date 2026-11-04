import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getCompanyOptions } from '@/features/dashboard/api/companies'
import { useCompanyOptions } from '@/features/dashboard/hooks/useCompanyOptions'

vi.mock('@/features/dashboard/api/companies', () => ({ getCompanyOptions: vi.fn() }))

const getCompaniesMock = vi.mocked(getCompanyOptions)

describe('useCompanyOptions', () => {
  beforeEach(() => getCompaniesMock.mockReset())

  it('does not request companies when disabled', () => {
    const { result } = renderHook(() => useCompanyOptions(false))

    expect(result.current.state).toEqual({ status: 'idle' })
    expect(getCompaniesMock).not.toHaveBeenCalled()
  })

  it('loads the companies and recovers from an error on retry', async () => {
    getCompaniesMock
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([{ id: 'a', name: 'Alfa' }])

    const { result } = renderHook(() => useCompanyOptions(true))
    expect(result.current.state).toEqual({ status: 'loading' })
    await waitFor(() => expect(result.current.state).toEqual({ status: 'error' }))

    act(() => result.current.retry())

    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: 'ready',
        companies: [{ id: 'a', name: 'Alfa' }],
      }),
    )
  })
})
