import { beforeEach, describe, expect, it, vi } from 'vitest'

import { adminToken, fakeJwt, userToken } from '@/test/jwt'

import {
  clearAccessToken,
  clearSession,
  getAccessToken,
  getSessionClaims,
  isAdminSession,
  saveAccessToken,
} from './authToken'

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

describe('authToken session', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('migrates the legacy onboarding token key', () => {
    sessionStorage.setItem('vstable:onboarding:access-token', 'legacy-token')

    expect(getAccessToken()).toBe('legacy-token')
    expect(sessionStorage.getItem('vstable:onboarding:access-token')).toBeNull()
  })

  it('drops the legacy localStorage login token instead of mixing identities', () => {
    localStorage.setItem('token', 'old-login-token')

    expect(getAccessToken()).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('clearSession removes the token and every identity-dependent value', () => {
    saveAccessToken('token-abc')
    sessionStorage.setItem('vstable:onboarding:representative-personal-data', '{}')
    localStorage.setItem('vstable:liveness:id', 'l1')
    localStorage.setItem('unrelated', 'keep')

    clearSession()

    expect(getAccessToken()).toBeNull()
    expect(sessionStorage.getItem('vstable:onboarding:representative-personal-data')).toBeNull()
    expect(localStorage.getItem('vstable:liveness:id')).toBeNull()
    expect(localStorage.getItem('unrelated')).toBe('keep')
  })

  it('reads user and admin claims from the token', () => {
    saveAccessToken(userToken('maria@empresa.com'))
    expect(getSessionClaims()).toMatchObject({ email: 'maria@empresa.com', accountType: 'USER' })
    expect(isAdminSession()).toBe(false)

    saveAccessToken(adminToken())
    expect(isAdminSession()).toBe(true)
  })

  it('treats expired or unreadable tokens as no session', () => {
    saveAccessToken(fakeJwt({ sub: 'a@b.com', exp: Math.floor(Date.now() / 1000) - 10 }))
    expect(getSessionClaims()).toBeNull()

    vi.spyOn(console, 'error').mockImplementation(() => {})
    saveAccessToken('not-a-jwt')
    expect(getSessionClaims()).toBeNull()
  })
})
