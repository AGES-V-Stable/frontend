import { beforeEach, describe, expect, it } from 'vitest'

import { clearAccessToken, getAccessToken, saveAccessToken } from './authToken'

describe('authToken service', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('returns null when no token was saved', () => {
    expect(getAccessToken()).toBeNull()
  })

  it('returns the saved token', () => {
    saveAccessToken('token-abc')

    expect(getAccessToken()).toBe('token-abc')
  })

  it('removes the token when cleared', () => {
    saveAccessToken('token-abc')

    clearAccessToken()

    expect(getAccessToken()).toBeNull()
  })
})
