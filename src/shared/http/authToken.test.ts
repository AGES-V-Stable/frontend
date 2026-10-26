import { beforeEach, describe, expect, it } from 'vitest'

import {
  clearAccessToken,
  clearSessionExpired,
  getAccessToken,
  getLoginToken,
  invalidateToken,
  saveAccessToken,
  saveLoginToken,
  wasSessionExpired,
} from '@/shared/http/authToken'

describe('authToken service', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
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

  it('returns the login token when there is no onboarding token', () => {
    saveLoginToken('login-token')

    expect(getAccessToken()).toBe('login-token')
  })

  it('prefers the onboarding token when both tokens exist', () => {
    localStorage.setItem('token', 'login-token')
    saveAccessToken('onboarding-token')

    expect(getAccessToken()).toBe('onboarding-token')
  })

  it('discards a leftover onboarding token when the login token is saved', () => {
    saveAccessToken('onboarding-token')

    saveLoginToken('login-token')

    expect(getAccessToken()).toBe('login-token')
    expect(sessionStorage.getItem('vstable:onboarding:access-token')).toBeNull()
  })

  it('keeps the login token when the onboarding token is cleared', () => {
    saveLoginToken('login-token')
    saveAccessToken('onboarding-token')

    clearAccessToken()

    expect(getAccessToken()).toBe('login-token')
  })

  it('marks the session as expired when the backend rejects the login token', () => {
    saveLoginToken('login-token')

    invalidateToken('login-token')

    expect(getLoginToken()).toBeNull()
    expect(wasSessionExpired()).toBe(true)
  })

  it('does not mark the session as expired when only the onboarding token is rejected', () => {
    saveAccessToken('onboarding-token')

    invalidateToken('onboarding-token')

    expect(getAccessToken()).toBeNull()
    expect(wasSessionExpired()).toBe(false)
  })

  it('clears the expired mark on a new login or when consumed', () => {
    saveLoginToken('old-token')
    invalidateToken('old-token')

    saveLoginToken('new-token')
    expect(wasSessionExpired()).toBe(false)

    invalidateToken('new-token')
    clearSessionExpired()
    expect(wasSessionExpired()).toBe(false)
  })
})
