import { afterEach, describe, expect, it, vi } from 'vitest'

import { getStoredUserType } from './session'

const storePayload = (payload: unknown) =>
  localStorage.setItem('token', `header.${btoa(JSON.stringify(payload))}.signature`)

describe('stored user type', () => {
  afterEach(() => vi.restoreAllMocks())

  it.each(['ADMIN', 'ROLE_ADMIN', ['ADMIN'], ['USER', 'ROLE_ADMIN']])(
    'recognizes admin roles in the existing stored JWT (%j)',
    (role) => {
      storePayload({ role })
      expect(getStoredUserType()).toBe('admin')
    },
  )

  it.each([
    { role: ['USER'] },
    { role: 'PME' },
    { role: [] },
    {},
    { role: 1 },
    { role: ['ADMIN', 1] },
    { role: 'NOT_ADMIN' },
    null,
  ])('uses PME navigation for non-admin or invalid claims (%j)', (payload) => {
    storePayload(payload)
    expect(getStoredUserType()).toBe('pme')
  })

  it('uses PME navigation when no token is stored', () => {
    expect(getStoredUserType()).toBe('pme')
  })

  it('handles an invalid token without crashing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem('token', 'invalid')
    expect(getStoredUserType()).toBe('pme')
  })
})
