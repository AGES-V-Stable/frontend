import { describe, expect, it } from 'vitest'
import type { User } from '@/features/auth'
import type { Member } from '../schemas/members'
import { canManageMember, canManageMembers } from './permissions'

const owner: User = {
  id: 'u-1',
  name: 'Marina Costa',
  email: 'marina@empresa.com',
  companyId: 'c-1',
  accountType: 'USER',
  roles: ['ROLE_USER'],
  companyAccess: {
    membershipId: 'm-1',
    companyId: 'c-1',
    role: 'OWNER',
    status: 'ACTIVE',
    permissions: ['MEMBERS_READ', 'MEMBERS_MANAGE'],
    version: 1,
  },
}
const member: Member = {
  id: 'm-2',
  userId: 'u-2',
  companyId: 'c-1',
  name: 'Ana Souza',
  email: 'ana@empresa.com',
  role: 'OPERATOR',
  status: 'ACTIVE',
  version: 1,
  joinedAt: '2026-11-01T12:00:00Z',
  removedAt: null,
}
const viewer = { userId: 'u-1', membershipId: 'm-1' }

describe('canManageMembers', () => {
  it('allows the active owner with the management permission of the session company', () => {
    expect(canManageMembers(owner)).toBe(true)
  })

  it.each([
    ['no session', null],
    ['no company access', { ...owner, companyAccess: null }],
    ['an operator', { ...owner, companyAccess: { ...owner.companyAccess!, role: 'OPERATOR' } }],
    [
      'a removed owner',
      { ...owner, companyAccess: { ...owner.companyAccess!, status: 'REMOVED' } },
    ],
    ['another company', { ...owner, companyAccess: { ...owner.companyAccess!, companyId: 'c-2' } }],
    ['no permission', { ...owner, companyAccess: { ...owner.companyAccess!, permissions: [] } }],
    ['no company', { ...owner, companyId: null }],
  ] as [string, User | null][])('denies %s', (_, user) => {
    expect(canManageMembers(user)).toBe(false)
  })
})

describe('canManageMember', () => {
  it('allows an active operator or viewer of someone else', () => {
    expect(canManageMember(member, viewer)).toBe(true)
    expect(canManageMember({ ...member, role: 'VIEWER' }, viewer)).toBe(true)
  })

  it.each([
    ['the owner', { ...member, role: 'OWNER' }],
    ['the own membership', { ...member, id: 'm-1' }],
    ['the own user', { ...member, userId: 'u-1' }],
    ['a removed member', { ...member, status: 'REMOVED' }],
  ] as [string, Member][])('never offers actions over %s', (_, target) => {
    expect(canManageMember(target, viewer)).toBe(false)
  })
})
