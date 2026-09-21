import { describe, expect, it } from 'vitest'

import { compliancePath, livenessPath, PATHS, registrationCompletePath } from './paths'

describe('PATHS configuration', () => {
  it('given route definitions, when accessing PATHS, then it should match the expected route paths', () => {
    const expectedPaths = {
      HOME: '/',
      LOGIN: '/login',
      REGISTER: '/register',
      REGISTER_COMPLIANCE: '/register/:kycVerificationId/compliance',
      COMPLIANCE_LIVENESS: '/register/:kycVerificationId/compliance/liveness',
      REGISTER_COMPLETE: '/register/:kycVerificationId/concluido',
      ADMIN_CLIENTS: '/admin/clientes-pme',
    }

    const actualPaths = PATHS

    expect(actualPaths).toEqual(expectedPaths)
  })

  it('given PATHS object, when verifying individual endpoints, then route properties should match exact path strings', () => {
    const homePath = PATHS.HOME
    const loginPath = PATHS.LOGIN
    const registerPath = PATHS.REGISTER
    const adminClientsPath = PATHS.ADMIN_CLIENTS
    const complianceLivenessPath = PATHS.COMPLIANCE_LIVENESS
    const registerCompletePath = PATHS.REGISTER_COMPLETE

    expect(homePath).toBe('/')
    expect(loginPath).toBe('/login')
    expect(registerPath).toBe('/register')
    expect(adminClientsPath).toBe('/admin/clientes-pme')
    expect(complianceLivenessPath).toBe('/register/:kycVerificationId/compliance/liveness')
    expect(registerCompletePath).toBe('/register/:kycVerificationId/concluido')
  })

  it('given an id, when building the compliance, liveness and registration-complete paths, then it should encode the id into the URL', () => {
    expect(compliancePath('abc 123')).toBe('/register/abc%20123/compliance')
    expect(livenessPath('abc 123')).toBe('/register/abc%20123/compliance/liveness')
    expect(registrationCompletePath('abc 123')).toBe('/register/abc%20123/concluido')
  })
})
