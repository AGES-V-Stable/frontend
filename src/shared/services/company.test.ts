import { afterEach, expect, it, vi } from 'vitest'
import { getCompany, getCompanyComplianceStatus } from './company'
import { saveAccessToken } from './authToken'
import { accountRequestOptions } from './session'

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

it('loads validated company data using the login token and abort signal', async () => {
  localStorage.setItem('token', 'test-token')
  const company = {
    id: 'c1',
    legalName: 'Empresa Teste',
    cnpj: '04933111000190',
    availableBalanceBrl: 1250,
  }
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(company)))
  vi.stubGlobal('fetch', fetchMock)
  const controller = new AbortController()
  await expect(getCompany('c1', controller.signal)).resolves.toEqual(company)
  expect(fetchMock).toHaveBeenCalledWith('/v1/companies/c1', {
    headers: { Authorization: 'Bearer test-token' },
    signal: controller.signal,
  })
})

it('uses the onboarding access token for account requests before login', () => {
  saveAccessToken('onboarding-token')
  expect(accountRequestOptions()).toEqual({
    headers: { Authorization: 'Bearer onboarding-token' },
    signal: undefined,
  })
})

it.each(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'])(
  'loads compliance status %s',
  async (overallStatus) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ overallStatus })))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getCompanyComplianceStatus('c1')).resolves.toBe(overallStatus)
    expect(fetchMock).toHaveBeenCalledWith('/v1/companies/c1/compliance-status', {
      signal: undefined,
    })
  },
)

it('rejects unknown compliance states instead of showing an approval', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ overallStatus: 'UNKNOWN' }))),
  )
  await expect(getCompanyComplianceStatus('c1')).rejects.toThrow()
})

it('rejects malformed company responses', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ availableBalanceBrl: 'invalid' }))),
  )
  await expect(getCompany('c1')).rejects.toThrow()
})
