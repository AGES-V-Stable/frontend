import { afterEach, describe, expect, it, vi } from 'vitest'
import { getBeneficiaries, getBeneficiary } from './beneficiary'
import type { Beneficiary, PaginatedBeneficiaries } from '@/types/beneficiary'

const beneficiary = {
  id: '1',
  companyId: 'company-1',
  nickname: 'Maria Oliveira',
  identificationDocument: '45123456000190',
  country: 'Brasil',
  receivingMethod: 'BANK_ACCOUNT',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
}

const paginatedResponse: PaginatedBeneficiaries = {
  content: [beneficiary as unknown as Beneficiary],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 10,
}

describe('beneficiary service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('loads a paginated list with the bearer token', async () => {
    localStorage.setItem('token', 'token-value')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => paginatedResponse }),
    )

    await expect(getBeneficiaries()).resolves.toEqual(paginatedResponse)

    // Verifica se os parâmetros default de paginação e o token foram enviados
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/beneficiaries?page=0&size=10'),
      {
        headers: { Accept: 'application/json', Authorization: 'Bearer token-value' },
      },
    )
  })

  it('applies query parameters correctly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => paginatedResponse }),
    )

    await getBeneficiaries({
      page: 2,
      size: 20,
      search: 'Maria',
      country: 'Brasil',
      document: '123',
    })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/v1\/beneficiaries\?page=1&size=20&search=Maria&document=123&country=Brasil/,
      ),
      expect.any(Object),
    )
  })

  it('throws when the list request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    await expect(getBeneficiaries()).rejects.toThrow('Request failed with status 500')
  })

  it('loads details from an enveloped or raw response', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: beneficiary }) })
        .mockResolvedValueOnce({ ok: true, json: async () => beneficiary }),
    )

    await expect(getBeneficiary('1')).resolves.toEqual(beneficiary)
    await expect(getBeneficiary('1')).resolves.toEqual(beneficiary)
  })

  it('throws when the details request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))

    await expect(getBeneficiary('missing')).rejects.toThrow('Request failed with status 404')
  })
})
