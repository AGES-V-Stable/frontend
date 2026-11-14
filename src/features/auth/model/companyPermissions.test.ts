import { describe, expect, it } from 'vitest'
import type { User } from '../api/user'
import { hasCompanyPermission } from './companyPermissions'

const user = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  name: 'Marina Costa',
  email: 'marina@example.com',
  companyId: 'c1',
  accountType: 'USER',
  roles: ['ROLE_USER'],
  companyAccess: {
    membershipId: 'm1',
    companyId: 'c1',
    role: 'OPERATOR',
    status: 'ACTIVE',
    permissions: ['COMPANY_READ', 'BENEFICIARY_WRITE', 'TRANSFER_CREATE'],
    version: 1,
  },
  ...overrides,
})

describe('hasCompanyPermission', () => {
  it('given an active membership in the session company, then it grants only the listed permissions', () => {
    expect(hasCompanyPermission(user(), 'TRANSFER_CREATE')).toBe(true)
    expect(hasCompanyPermission(user(), 'MEMBERS_MANAGE')).toBe(false)
  })

  it('given a removed membership, then nothing is granted even if a permission is still listed', () => {
    const removed = user({
      companyAccess: { ...user().companyAccess!, status: 'REMOVED' },
    })

    expect(hasCompanyPermission(removed, 'TRANSFER_CREATE')).toBe(false)
  })

  it('given a membership of another company, then nothing is granted', () => {
    const other = user({ companyAccess: { ...user().companyAccess!, companyId: 'c2' } })

    expect(hasCompanyPermission(other, 'TRANSFER_CREATE')).toBe(false)
  })

  it.each([
    ['no session', null],
    ['an account without company access', user({ companyAccess: null })],
    ['a platform administrator', user({ accountType: 'ADMIN', companyId: null })],
  ])('given %s, then nothing is granted', (_, subject) => {
    expect(hasCompanyPermission(subject, 'COMPANY_READ')).toBe(false)
  })
})
