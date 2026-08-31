import { describe, expect, it } from 'vitest'

import { PATHS } from './paths'

describe('PATHS configuration', () => {
  it('given route definitions, when accessing PATHS, then it should match the expected route paths', () => {
    const expectedPaths = {
      HOME: '/',
      LOGIN: '/login',
      REGISTER: '/register',
    }

    const actualPaths = PATHS

    expect(actualPaths).toEqual(expectedPaths)
  })

  it('given PATHS object, when verifying individual endpoints, then route properties should match exact path strings', () => {
    const homePath = PATHS.HOME
    const loginPath = PATHS.LOGIN
    const registerPath = PATHS.REGISTER

    expect(homePath).toBe('/')
    expect(loginPath).toBe('/login')
    expect(registerPath).toBe('/register')
  })
})
