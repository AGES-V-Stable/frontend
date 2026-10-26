import { afterEach, expect, it, vi } from 'vitest'
import { getCurrentUser, getCompanyProfile } from './user'
import { saveAccessToken, saveLoginToken } from '@/shared/http/authToken'
const user = {
  id: 'u1',
  name: 'Marina Costa',
  email: 'm@example.com',
  companyId: 'c1',
  accountType: 'USER',
  roles: ['ROLE_USER'],
}
afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})
it('validates identity and roles from /me', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(user))))
  await expect(getCurrentUser()).resolves.toEqual(user)
})
it('accepts admins without a company', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ ...user, companyId: null, accountType: 'ADMIN', roles: ['ROLE_ADMIN'] }),
        ),
      ),
  )
  expect((await getCurrentUser()).companyId).toBeNull()
})
it('uses login credentials even when an onboarding token exists', async () => {
  saveLoginToken('login')
  saveAccessToken('onboarding')
  const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(user)))
  vi.stubGlobal('fetch', mock)
  const controller = new AbortController()
  await getCurrentUser(controller.signal)
  expect(mock).toHaveBeenCalledWith('/v1/users/me', {
    signal: controller.signal,
    headers: { Authorization: 'Bearer login' },
  })
})
it('rejects malformed identities', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')))
  await expect(getCurrentUser()).rejects.toThrow()
})
it('loads a company profile with an encoded identifier', async () => {
  const company = { id: 'c1', legalName: 'Empresa', tradeName: null, cnpj: '123' }
  const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(company)))
  vi.stubGlobal('fetch', mock)
  await expect(getCompanyProfile('a/b')).resolves.toEqual(company)
  expect(mock.mock.calls[0][0]).toBe('/v1/companies/a%2Fb')
})
it('preserves HTTP errors', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('{"message":"Não autenticado"}', { status: 401 })),
  )
  await expect(getCurrentUser()).rejects.toMatchObject({ status: 401, message: 'Não autenticado' })
})
