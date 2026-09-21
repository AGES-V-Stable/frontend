import { describe, expect, it } from 'vitest'

import { livenessPath, PATHS, registrationCompletePath } from './paths'

describe('PATHS configuration', () => {
  it('given route definitions, when accessing PATHS, then it should match the expected route paths', () => {
    const expectedPaths = {
      HOME: '/',
      LOGIN: '/login',
      REGISTER: '/register',
      REGISTER_COMPANY: '/register/empresa',
      REGISTER_COMPANY_PROGRESS: '/register/:progressoCadastroId/empresa',
      REGISTER_COMPLIANCE: '/register/:progressoCadastroId/compliance',
      COMPLIANCE_LIVENESS: '/register/:progressoCadastroId/compliance/liveness',
      REGISTER_COMPLETE: '/register/:progressoCadastroId/concluido',
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
    expect(complianceLivenessPath).toBe('/register/:progressoCadastroId/compliance/liveness')
    expect(registerCompletePath).toBe('/register/:progressoCadastroId/concluido')
  })

  it('given an id, when building the liveness and registration-complete paths, then it should encode the id into the URL', () => {
    expect(livenessPath('abc 123')).toBe('/register/abc%20123/compliance/liveness')
    expect(registrationCompletePath('abc 123')).toBe('/register/abc%20123/concluido')
  })
})
