import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  getBeneficiaries,
  getBeneficiary,
  createBeneficiary,
  type BeneficiaryCreatePayload,
} from './beneficiary'
import { ApiError } from './registration'

const paginatedResponse = {
  content: [
    {
      id: '1',
      companyId: 'company-1',
      nickname: 'Maria Oliveira',
      identificationDocument: '45123456000190',
      country: 'Brasil',
      address: 'Rua das Flores, 123',
      legalName: 'Maria Oliveira Silva',
      receivingMethod: 'BANK_ACCOUNT',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    },
  ],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 20,
}

describe('beneficiary service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('loads a paginated list with the bearer token', async () => {
    localStorage.setItem('token', 'my-token')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(paginatedResponse),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await getBeneficiaries({ page: 1, size: 20 })

    expect(result.content).toHaveLength(1)
    expect(result.content[0].nickname).toBe('Maria Oliveira')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/beneficiaries'),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer my-token',
        },
      }),
    )
  })

  it('applies query parameters correctly', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(paginatedResponse),
    })
    vi.stubGlobal('fetch', fetchMock)

    await getBeneficiaries({
      page: 2,
      size: 20,
      search: 'Maria',
      document: '123',
      country: 'Brasil',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/v1\/beneficiaries\?page=1&size=20&search=Maria&document=123&country=Brasil/,
      ),
      expect.any(Object),
    )
  })

  it('throws when the list request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    await expect(getBeneficiaries({ page: 1, size: 20 })).rejects.toThrow(
      'Request failed with status 500',
    )
  })

  it('loads details from an enveloped or raw response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: paginatedResponse.content[0] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await getBeneficiary('1')
    expect(result.id).toBe('1')
    expect(result.nickname).toBe('Maria Oliveira')
  })

  it('throws when the details request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))

    await expect(getBeneficiary('missing')).rejects.toThrow('Request failed with status 404')
  })

  it('creates a bank-account beneficiary via POST /v1/companies/{companyId}/beneficiaries', async () => {
    const mock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'new-id' }) })
    vi.stubGlobal('fetch', mock)

    const payload: BeneficiaryCreatePayload = {
      beneficiaryType: 'Pessoa jurídica',
      legalName: 'Fornecedor Global Ltda.',
      identificationDocument: '12345678900',
      country: 'Brasil',
      address: 'Av. Paulista, 1000',
      confirmed: true,
      receivingMethod: 'BANK_ACCOUNT',
      bankName: 'Banco XYZ',
      swiftBic: 'BOFAUS3N',
      accountNumber: 'BR1800000000141455970000123456',
      currency: 'USD',
      nickname: 'Fornecedor principal',
    }

    const result = await createBeneficiary('c1', payload)

    expect(result).toEqual({ id: 'new-id' })
    expect(mock).toHaveBeenCalledWith(
      '/v1/companies/c1/beneficiaries',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    )
  })

  it('creates a wallet beneficiary and encodes the companyId', async () => {
    const mock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'new-id' }) })
    vi.stubGlobal('fetch', mock)

    const payload: BeneficiaryCreatePayload = {
      beneficiaryType: 'Pessoa jurídica',
      legalName: 'João da Silva Comércio Ltda.',
      identificationDocument: '12345678000190',
      country: 'Brasil',
      address: 'Rua A, 100',
      confirmed: true,
      receivingMethod: 'CRYPTO_WALLET',
      walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      blockchainNetwork: 'polygon',
      nickname: 'Fornecedor principal',
    }

    await createBeneficiary('c1/2', payload)

    expect(mock).toHaveBeenCalledWith(
      '/v1/companies/c1%2F2/beneficiaries',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('throws an ApiError when creation fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ message: 'Empresa não verificada' }),
      }),
    )

    await expect(
      createBeneficiary('c1', {
        beneficiaryType: 'Pessoa jurídica',
        legalName: 'X',
        identificationDocument: '123',
        country: 'BR',
        address: 'X',
        confirmed: true,
        receivingMethod: 'BANK_ACCOUNT',
        bankName: 'X',
        swiftBic: 'X',
        accountNumber: 'X',
        currency: 'USD',
        nickname: 'X',
      }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})
