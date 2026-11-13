import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/shared/http/httpClient'
import { getInvitationLink } from '../api/invitations'
import { copyText } from '../model/clipboard'
import type { Invitation } from '../schemas/members'
import { useInvitationActions } from './useInvitationActions'

vi.mock('../api/invitations', () => ({
  getInvitationLink: vi.fn(),
  regenerateInvitationLink: vi.fn(),
  revokeInvitation: vi.fn(),
}))
vi.mock('../model/clipboard', () => ({ copyText: vi.fn() }))

const getInvitationLinkMock = vi.mocked(getInvitationLink)
const copyTextMock = vi.mocked(copyText)

const invitation = (id: string, name: string): Invitation => ({
  id,
  companyId: 'c-1',
  name,
  email: `${id}@empresa.com`,
  role: 'OPERATOR',
  status: 'PENDING',
  version: 1,
})
const inviteA = invitation('a', 'Ana')
const inviteB = invitation('b', 'Bruno')

function setup() {
  const report = vi.fn()
  const reload = vi.fn()
  const hook = renderHook(() => useInvitationActions('c-1', report, reload))
  return { ...hook, report, reload }
}

describe('useInvitationActions', () => {
  beforeEach(() => {
    getInvitationLinkMock.mockReset()
    copyTextMock.mockReset()
  })

  it('starts the copy within the click, with the link still loading', () => {
    getInvitationLinkMock.mockReturnValue(new Promise(() => undefined))
    copyTextMock.mockResolvedValue(true)
    const { result } = setup()

    act(() => void result.current.copyFromRow(inviteA))

    expect(copyTextMock).toHaveBeenCalledTimes(1)
    expect(copyTextMock.mock.calls[0]![0]).toBeInstanceOf(Promise)
  })

  it('given a failed copy and no dialog open, then it opens the invitation with the link to copy manually', async () => {
    getInvitationLinkMock.mockResolvedValue({ invitation: inviteA, inviteUrl: 'https://app/c?t=a' })
    copyTextMock.mockResolvedValue(false)
    const { result } = setup()

    await act(() => result.current.copyFromRow(inviteA))

    expect(result.current.active).toMatchObject({
      invitation: { id: 'a' },
      inviteUrl: 'https://app/c?t=a',
    })
  })

  it('given another invitation opened during the copy, when the copy fails, then that dialog is kept', async () => {
    let resolveLink: (value: { invitation: Invitation; inviteUrl: string }) => void = () =>
      undefined
    getInvitationLinkMock.mockReturnValue(new Promise((done) => (resolveLink = done)))
    copyTextMock.mockResolvedValue(false)
    const { result, report } = setup()

    let copy: Promise<boolean> = Promise.resolve(false)
    act(() => {
      copy = result.current.copyFromRow(inviteA)
    })
    act(() => result.current.open(inviteB))
    await act(async () => {
      resolveLink({ invitation: inviteA, inviteUrl: 'https://app/c?t=a' })
      await copy
    })

    expect(result.current.active?.invitation.id).toBe('b')
    expect(result.current.active?.inviteUrl).toBeNull()
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: 'warning',
        message: expect.stringContaining('Feche o diálogo'),
      }),
    )
  })

  it('given another invitation opened during the copy, when the copied one is stale, then that dialog stays open', async () => {
    let rejectLink: (reason: unknown) => void = () => undefined
    getInvitationLinkMock.mockReturnValue(new Promise((_done, fail) => (rejectLink = fail)))
    copyTextMock.mockResolvedValue(false)
    const { result, reload } = setup()

    let copy: Promise<boolean> = Promise.resolve(false)
    act(() => {
      copy = result.current.copyFromRow(inviteA)
    })
    act(() => result.current.open(inviteB))
    await act(async () => {
      rejectLink(new HttpError('Revogado', 410, {}, 'INVITATION_REVOKED'))
      await copy
    })

    expect(result.current.active?.invitation.id).toBe('b')
    expect(reload).toHaveBeenCalled()
  })
})
