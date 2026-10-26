import { beforeEach, expect, it } from 'vitest'
import { isStoredAdmin } from './storedAccount'

beforeEach(() => localStorage.clear())
function store(claims: unknown) {
  localStorage.setItem('token', `header.${btoa(JSON.stringify(claims))}.signature`)
}
it('reads administrator account_type from the stored login token', () => {
  store({ account_type: 'ADMIN', role: ['ROLE_ADMIN'] })
  expect(isStoredAdmin()).toBe(true)
})
it('recognizes the legacy admin role when account_type is absent', () => {
  store({ role: ['ROLE_USER', 'ROLE_ADMIN'] })
  expect(isStoredAdmin()).toBe(true)
})
it('gives explicit account_type priority over legacy roles', () => {
  store({ account_type: 'USER', role: ['ROLE_ADMIN'] })
  expect(isStoredAdmin()).toBe(false)
})
it.each([null, 'invalid', 'header.%%%.signature', 'header.bnVsbA.signature'])(
  'does not select admin for missing or malformed token %s',
  (token) => {
    if (token !== null) localStorage.setItem('token', token)
    expect(isStoredAdmin()).toBe(false)
  },
)
it.each([{}, { account_type: 'OWNER' }, { role: 'ROLE_ADMIN' }, { role: ['ROLE_USER'] }])(
  'does not select admin for non-admin or invalid claims %j',
  (claims) => {
    store(claims)
    expect(isStoredAdmin()).toBe(false)
  },
)
it('ignores onboarding tokens when choosing login navigation', () => {
  sessionStorage.setItem(
    'vstable:onboarding:access-token',
    `header.${btoa(JSON.stringify({ account_type: 'ADMIN' }))}.signature`,
  )
  expect(isStoredAdmin()).toBe(false)
  sessionStorage.clear()
})
