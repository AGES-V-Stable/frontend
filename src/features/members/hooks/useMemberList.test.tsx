import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMembers } from '../api/members'
import { useMemberList } from './useMemberList'

vi.mock('../api/members', () => ({ getMembers: vi.fn() }))

function members(companyId: string, name: string) {
  return {
    items: [
      {
        kind: 'MEMBER' as const,
        member: {
          id: `membership-${companyId}`,
          userId: `user-${companyId}`,
          companyId,
          name,
          email: `${companyId}@example.test`,
          role: 'OWNER' as const,
          status: 'ACTIVE' as const,
          version: 1,
          joinedAt: '2026-11-01T12:00:00Z',
          removedAt: null,
        },
      },
    ],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
    summary: { activeMembers: 1, pendingInvitations: 0, peopleCount: 1 },
  }
}

describe('useMemberList — isolamento de empresa', () => {
  beforeEach(() => vi.clearAllMocks())

  it('never displays the previous company list while a new company is loading', async () => {
    const first = members('company-a', 'Pessoa da Empresa A')
    const second = members('company-b', 'Pessoa da Empresa B')
    let resolveSecond!: (value: typeof second) => void

    vi.mocked(getMembers).mockImplementation(async (companyId) => {
      if (companyId === 'company-a') return first
      return new Promise<typeof second>((resolve) => {
        resolveSecond = resolve
      })
    })

    const { result, rerender } = renderHook(
      ({ companyId }: { companyId: string }) => useMemberList(companyId),
      { initialProps: { companyId: 'company-a' } },
    )
    await waitFor(() =>
      expect(result.current.data?.items[0]).toMatchObject({
        kind: 'MEMBER',
        member: { name: 'Pessoa da Empresa A' },
      }),
    )

    rerender({ companyId: 'company-b' })
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()

    await act(async () => resolveSecond(second))
    await waitFor(() =>
      expect(result.current.data?.items[0]).toMatchObject({
        kind: 'MEMBER',
        member: { name: 'Pessoa da Empresa B' },
      }),
    )
  })

  it('ignores a late response from the previous company, even when fetch does not honor abort', async () => {
    const first = members('company-a', 'Pessoa da Empresa A')
    const second = members('company-b', 'Pessoa da Empresa B')
    let resolveFirst!: (value: typeof first) => void

    vi.mocked(getMembers).mockImplementation(async (companyId) => {
      if (companyId === 'company-b') return second
      return new Promise<typeof first>((resolve) => {
        resolveFirst = resolve
      })
    })

    const { result, rerender } = renderHook(
      ({ companyId }: { companyId: string }) => useMemberList(companyId),
      { initialProps: { companyId: 'company-a' } },
    )

    rerender({ companyId: 'company-b' })
    await waitFor(() =>
      expect(result.current.data?.items[0]).toMatchObject({
        kind: 'MEMBER',
        member: { name: 'Pessoa da Empresa B' },
      }),
    )

    await act(async () => resolveFirst(first))
    expect(result.current.data?.items[0]).toMatchObject({
      kind: 'MEMBER',
      member: { name: 'Pessoa da Empresa B' },
    })
  })

  it('keeps the current company list during a same-company reload', async () => {
    const first = members('company-a', 'Pessoa da Empresa A')
    let resolveReload!: (value: typeof first) => void
    vi.mocked(getMembers)
      .mockResolvedValueOnce(first)
      .mockImplementationOnce(
        () =>
          new Promise<typeof first>((resolve) => {
            resolveReload = resolve
          }),
      )

    const { result } = renderHook(() => useMemberList('company-a'))
    await waitFor(() => expect(result.current.data).toEqual(first))

    act(() => result.current.reload())
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toEqual(first)

    await act(async () => resolveReload(first))
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual(first)
  })
})
