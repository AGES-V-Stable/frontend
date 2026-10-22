import { describe, expect, it } from 'vitest'

import {
  compliancePath,
  livenessPath,
  PATHS,
  registrationCompletePath,
  transferDetailsPath,
  twoFactorSetupPath,
} from '@/shared/navigation/paths'

describe('PATHS configuration', () => {
  it('matches the expected route paths', () => {
    const expectedPaths = {
      HOME: '/',
      LOGIN: '/login',
      REGISTER: '/register',
      REGISTER_COMPANY: '/register/empresa',
      REGISTER_REPRESENTATIVE: '/register/representante',
      REGISTER_2FA: '/register/:kycVerificationId/2fa',
      REGISTER_COMPLIANCE: '/register/:kycVerificationId/compliance',
      COMPLIANCE_LIVENESS: '/register/:kycVerificationId/compliance/liveness',
      REGISTER_COMPLETE: '/register/:kycVerificationId/concluido',
      ADMIN_CLIENTS: '/admin/clientes-pme',
      REGISTER_STATUS: '/register/status',
      FORGOT_PASSWORD: '/esqueci-senha',
      ADMIN_TRANSFERS: '/admin/transferencias',
      ADMIN_BENEFICIARIES: '/admin/beneficiarios',
      BENEFICIARIES: '/app/beneficiarios',
      BENEFICIARIES_NEW: '/app/beneficiarios/novo',
      TRANSFERS: '/app/transferencias/nova',
      TRANSFER_DETAILS: '/app/transferencias/:id',
      SETTINGS: '/app/configuracoes',
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

  it('formats compliancePath with encoded verification id', () => {
    expect(compliancePath('abc 123')).toBe('/register/abc%20123/compliance')
  })

  it('formats twoFactorSetupPath with encoded verification id', () => {
    expect(twoFactorSetupPath('abc 123')).toBe('/register/abc%20123/2fa')
  })

  it('formats livenessPath with encoded verification id', () => {
    expect(livenessPath('abc 123')).toBe('/register/abc%20123/compliance/liveness')
  })

  it('formats registrationCompletePath with encoded verification id', () => {
    expect(registrationCompletePath('abc 123')).toBe('/register/abc%20123/concluido')
  })

  it('formats transferDetailsPath with encoded verification id', () => {
    expect(transferDetailsPath('t-123')).toBe('/app/transferencias/t-123')
  })
})
