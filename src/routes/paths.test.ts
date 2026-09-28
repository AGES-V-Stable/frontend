import { describe, expect, it } from 'vitest'

import { compliancePath, livenessPath, PATHS, registrationCompletePath } from './paths'

describe('PATHS configuration', () => {
  it('matches the expected route paths', () => {
    const expectedPaths = {
      HOME: '/',
      LOGIN: '/login',
      REGISTER: '/register',
      REGISTER_COMPANY: '/register/empresa',
      REGISTER_REPRESENTATIVE: '/register/representante',
      REGISTER_COMPLIANCE: '/register/:kycVerificationId/compliance',
      COMPLIANCE_LIVENESS: '/register/:kycVerificationId/compliance/liveness',
      REGISTER_COMPLETE: '/register/:kycVerificationId/concluido',
      ADMIN_CLIENTS: '/admin/clientes-pme',
      DEMO: '/demo',
      DEMO_HOME: '/demo/home',
      DEMO_LOGIN: '/demo/login',
      DEMO_REGISTER: '/demo/register',
      DEMO_REGISTER_COMPANY: '/demo/register/empresa',
      DEMO_REGISTER_REPRESENTATIVE: '/demo/register/representante',
      DEMO_REGISTER_COMPLIANCE: '/demo/register/compliance',
      DEMO_ADMIN_CLIENTS: '/demo/admin/clientes-pme',
      REGISTER_STATUS: '/register/status',
      FORGOT_PASSWORD: '/esqueci-senha',
      ADMIN_TRANSFERS: '/admin/transferencias',
      ADMIN_BENEFICIARIES: '/admin/beneficiarios',
    }

    const actualPaths = PATHS

    expect(actualPaths).toEqual(expectedPaths)
  })

  it('matches exact path strings for individual endpoints', () => {
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
