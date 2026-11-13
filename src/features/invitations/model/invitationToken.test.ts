import { afterEach, describe, expect, it, vi } from 'vitest'
import { INVITATION_STORAGE_KEY, INVITATION_TOKEN } from '@/test/fixtures/companyInvitation'
import {
  clearInvitationToken,
  readInvitationToken,
  saveInvitationToken,
  tokenFromHash,
} from './invitationToken'

afterEach(() => {
  vi.restoreAllMocks()
  clearInvitationToken()
  sessionStorage.clear()
})

describe('tokenFromHash', () => {
  it('extracts the base64url token from the link fragment', () => {
    expect(tokenFromHash(`#token=${INVITATION_TOKEN}`)).toBe(INVITATION_TOKEN)
  })

  it.each(['', '#', '#token=', '#token=curto', `#outro=${INVITATION_TOKEN}`, '#token=a+b/c='])(
    'returns null for the malformed fragment "%s"',
    (hash) => {
      expect(tokenFromHash(hash)).toBeNull()
    },
  )
})

describe('invitation token storage', () => {
  it('keeps the token only in sessionStorage, never in localStorage', () => {
    saveInvitationToken(INVITATION_TOKEN)

    expect(sessionStorage.getItem(INVITATION_STORAGE_KEY)).toBe(INVITATION_TOKEN)
    expect(JSON.stringify({ ...localStorage })).not.toContain(INVITATION_TOKEN)
    expect(readInvitationToken()).toBe(INVITATION_TOKEN)
  })

  it('clears the token at the end of the flow', () => {
    saveInvitationToken(INVITATION_TOKEN)
    clearInvitationToken()

    expect(readInvitationToken()).toBeNull()
    expect(sessionStorage.getItem(INVITATION_STORAGE_KEY)).toBeNull()
  })

  it('falls back to memory when sessionStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    saveInvitationToken(INVITATION_TOKEN)
    expect(readInvitationToken()).toBe(INVITATION_TOKEN)
    clearInvitationToken()
    expect(readInvitationToken()).toBeNull()
  })
})
