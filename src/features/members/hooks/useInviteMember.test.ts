import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/shared/http/httpClient'
import { createInvitation } from '../api/invitations'
import { useInviteMember } from './useInviteMember'

vi.mock('../api/invitations', () => ({ createInvitation: vi.fn(), getInvitationLink: vi.fn() }))

describe('useInviteMember', () => {
  it('given an existing invitation without its id in the response, then it points to the list instead of a retry', async () => {
    vi.mocked(createInvitation).mockRejectedValue(
      new HttpError(
        'Já existe',
        409,
        { code: 'INVITATION_ALREADY_EXISTS' },
        'INVITATION_ALREADY_EXISTS',
      ),
    )
    const { result } = renderHook(() => useInviteMember('c-1', vi.fn()))

    await act(() =>
      result.current.submit({ name: 'Ana', email: 'ana@empresa.com', role: 'OPERATOR' }),
    )

    expect(result.current.failure?.message).toContain(
      'Já existe um convite pendente para este e-mail',
    )
    expect(result.current.failure?.message).not.toContain('Tente novamente')
  })
})
