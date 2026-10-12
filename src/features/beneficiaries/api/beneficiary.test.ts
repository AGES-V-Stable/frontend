import { afterEach, expect, it, vi } from 'vitest'
import {
  getBeneficiaries,
  getCompanyBeneficiaries,
  getBeneficiary,
  createBeneficiary,
} from './beneficiary'
import { saveLoginToken } from '@/shared/http/authToken'
const beneficiary = {
  id: 'b1',
  companyId: 'c1',
  nickname: 'Atlas',
  receivingMethod: 'BANK_ACCOUNT',
  createdAt: '2026-10-01T12:00:00Z',
  updatedAt: '2026-10-01T12:00:00Z',
  country: 'Brasil',
  currency: 'USD',
}
const page = { content: [beneficiary], totalElements: 1, totalPages: 1, number: 0, size: 20 }
afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})
it('loads authenticated administrator beneficiaries', async () => {
  saveLoginToken('login')
  const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(page)))
  vi.stubGlobal('fetch', mock)
  await expect(getBeneficiaries()).resolves.toEqual(page)
  expect(mock).toHaveBeenCalledWith(
    '/v1/beneficiaries?page=0&size=20',
    expect.objectContaining({ headers: { Authorization: 'Bearer login' } }),
  )
})
it('encodes company scope and sends only supported filters', async () => {
  const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(page)))
  vi.stubGlobal('fetch', mock)
  await getCompanyBeneficiaries('a/b', {
    page: 2,
    size: 10,
    search: 'Atlas',
    country: 'Brasil',
    document: '123',
  })
  expect(mock.mock.calls[0][0]).toBe(
    '/v1/companies/a%2Fb/beneficiaries?page=1&size=10&search=Atlas&country=Brasil&document=123',
  )
})
it('scopes detail reads to the company', async () => {
  const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(beneficiary)))
  vi.stubGlobal('fetch', mock)
  await expect(getBeneficiary('b/1', 'c/1')).resolves.toEqual(beneficiary)
  expect(mock.mock.calls[0][0]).toBe('/v1/companies/c%2F1/beneficiaries/b%2F1')
})
it('uses the administrator detail endpoint without company scope', async () => {
  const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(beneficiary)))
  vi.stubGlobal('fetch', mock)
  await getBeneficiary('b1')
  expect(mock.mock.calls[0][0]).toBe('/v1/beneficiaries/b1')
})
it('creates a company beneficiary with JSON content type', async () => {
  const payload = {
    beneficiaryType: 'Pessoa jurídica',
    legalName: 'Atlas',
    identificationDocument: '123',
    country: 'Brasil',
    address: 'Rua 1',
    confirmed: true,
    receivingMethod: 'BANK_ACCOUNT' as const,
    nickname: 'Atlas',
  }
  const mock = vi.fn().mockResolvedValue(new Response('{"id":"b1"}', { status: 201 }))
  vi.stubGlobal('fetch', mock)
  await expect(createBeneficiary('c1', payload)).resolves.toEqual({ id: 'b1' })
  expect(mock).toHaveBeenCalledWith(
    '/v1/companies/c1/beneficiaries',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    }),
  )
})
it.each([401, 403, 404, 500])('rejects HTTP %s without returning empty data', async (status) => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(new Response('{"message":"Failed","code":"ACCESS_DENIED"}', { status })),
  )
  await expect(getBeneficiaries()).rejects.toMatchObject({
    status,
    message: 'Failed',
    code: 'ACCESS_DENIED',
  })
})
it('rejects an unsupported envelope', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"data":[]}')))
  await expect(getBeneficiaries()).rejects.toThrow()
})
it('preserves valid empty pages', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ...page, content: [], totalElements: 0, totalPages: 0 })),
      ),
  )
  expect((await getBeneficiaries()).content).toEqual([])
})
