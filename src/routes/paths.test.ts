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
      REGISTER_COMPLETE: '/register/:progressoCadastroId/conclusao',
      ADMIN_CLIENTS: '/admin/clientes-pme',
      DEMO: '/demo',
      DEMO_HOME: '/demo/home',
      DEMO_LOGIN: '/demo/login',
      DEMO_REGISTER: '/demo/register',
      DEMO_REGISTER_COMPANY: '/demo/register/empresa',
      DEMO_REGISTER_REPRESENTATIVE: '/demo/register/representante',
      DEMO_REGISTER_COMPLIANCE: '/demo/register/compliance',
      DEMO_ADMIN_CLIENTS: '/demo/admin/clientes-pme',
    }

    const actualPaths = PATHS

    expect(actualPaths).toEqual(expectedPaths)
  })

  it('given PATHS object, when verifying individual endpoints, then route properties should match exact path strings', () => {
    const homePath = PATHS.HOME
    const loginPath = PATHS.LOGIN
    const registerPath = PATHS.REGISTER
    const adminClientsPath = PATHS.ADMIN_CLIENTS

    expect(homePath).toBe('/')
    expect(loginPath).toBe('/login')
    expect(registerPath).toBe('/register')
    expect(adminClientsPath).toBe('/admin/clientes-pme')
  })
})
