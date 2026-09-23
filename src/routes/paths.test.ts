import { describe, expect, it } from 'vitest'

import { companyPath, compliancePath, completionPath, representativePath, PATHS } from './paths'

describe('PATHS configuration', () => {
  it('matches the expected route paths', () => {
    const expectedPaths = {
      HOME: '/',
      LOGIN: '/login',
      REGISTER: '/register',
      REGISTER_COMPANY: '/register/empresa',
      REGISTER_COMPANY_PROGRESS: '/register/:progressoCadastroId/empresa',
      REGISTER_REPRESENTATIVE: '/register/:progressoCadastroId/representante',
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

    expect(homePath).toBe('/')
    expect(loginPath).toBe('/login')
    expect(registerPath).toBe('/register')
    expect(adminClientsPath).toBe('/admin/clientes-pme')
  })

  it('encodes registration IDs in every generated step path', () => {
    expect(companyPath('id/with spaces')).toBe('/register/id%2Fwith%20spaces/empresa')
    expect(representativePath('id/with spaces')).toBe('/register/id%2Fwith%20spaces/representante')
    expect(compliancePath('id/with spaces')).toBe('/register/id%2Fwith%20spaces/compliance')
    expect(completionPath('id/with spaces')).toBe('/register/id%2Fwith%20spaces/conclusao')
  })
})
