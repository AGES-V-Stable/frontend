import { describe, expect, it } from 'vitest'

import { PATHS } from './paths'

describe('PATHS configuration', () => {
  it('given route definitions, when accessing PATHS, then it should match the expected route paths', () => {
    const expectedPaths = {
      HOME: '/',
      LOGIN: '/login',
      REGISTER: '/register',
      REGISTER_COMPANY: '/register/empresa',
      REGISTER_COMPANY_PROGRESS: '/register/:progressoCadastroId/empresa',
      REGISTER_COMPLIANCE: '/register/:progressoCadastroId/compliance',
      ADMIN_CLIENTS: '/admin/clientes-pme',
      COMPLIANCE_LIVENESS: '/cadastro/compliance/liveness',
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

    expect(homePath).toBe('/')
    expect(loginPath).toBe('/login')
    expect(registerPath).toBe('/register')
    expect(adminClientsPath).toBe('/admin/clientes-pme')
    expect(complianceLivenessPath).toBe('/cadastro/compliance/liveness')
  })
})
