import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getBeneficiaries,
  getBeneficiary,
  getCompanyBeneficiaries,
  createBeneficiary,
} from './beneficiary'
import { ApiError } from './api'
import { saveAccessToken } from './authToken'
import type { BeneficiaryCreatePayload } from './beneficiary'
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
    sessionStorage.clear()
  })

  it('loads a paginated list with the bearer token', async () => {
    saveAccessToken('token-value')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => paginatedResponse }),
    )

    await expect(getBeneficiaries()).resolves.toEqual(paginatedResponse)

    // Verifica se os parâmetros default de paginação e o token foram enviados
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/beneficiaries?page=0&size=10'),
      expect.objectContaining({
        headers: { Accept: 'application/json', Authorization: 'Bearer token-value' },
      }),
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

  it('throws an ApiError with the status when the list request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    await expect(getBeneficiaries()).rejects.toMatchObject({ status: 500 })
  })

  it('loads details from GET /v1/beneficiaries/{id}', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => beneficiary })
    vi.stubGlobal('fetch', mock)

    await expect(getBeneficiary('1')).resolves.toEqual(beneficiary)
    expect(mock).toHaveBeenCalledWith('/v1/beneficiaries/1', expect.any(Object))
  })

  it('throws when the details request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))

    await expect(getBeneficiary('missing')).rejects.toMatchObject({ status: 404 })
  })

  it('lists the company beneficiaries through the company-scoped route', async () => {
    saveAccessToken('token-value')
    const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => paginatedResponse })
    vi.stubGlobal('fetch', mock)

    await expect(getCompanyBeneficiaries('c 1', { page: 2, size: 5 })).resolves.toEqual(
      paginatedResponse,
    )
    expect(mock).toHaveBeenCalledWith(
      '/v1/companies/c%201/beneficiaries?page=1&size=5',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-value' }),
      }),
    )
  })

  it('creates a bank-account beneficiary via POST /v1/companies/{companyId}/beneficiaries', async () => {
    const payload: BeneficiaryCreatePayload = {
      beneficiaryType: 'Pessoa jurídica',
      legalName: 'João da Silva Comércio Ltda.',
      identificationDocument: '12345678000190',
      country: 'Brasil',
      address: 'Rua A, 100',
      confirmed: true,
      receivingMethod: 'BANK_ACCOUNT',
      bankName: 'Banco XYZ',
      swiftBic: 'BOFAUS3N',
      accountNumber: 'BR1800000000141455970000123456',
      currency: 'USD',
      nickname: 'Fornecedor principal',
    }
    const mock = vi.fn(async () => new Response(JSON.stringify({ id: 'b1' }), { status: 201 }))
    vi.stubGlobal('fetch', mock)

    await expect(createBeneficiary('c1', payload)).resolves.toEqual({ id: 'b1' })
    expect(mock).toHaveBeenCalledWith(
      '/v1/companies/c1/beneficiaries',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      }),
    )
    vi.unstubAllGlobals()
  })

  it('creates a wallet beneficiary and encodes the companyId', async () => {
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
    const mock = vi.fn(async () => new Response(JSON.stringify({ id: 'b2' }), { status: 201 }))
    vi.stubGlobal('fetch', mock)

    await createBeneficiary('c1/2', payload)

    expect(mock).toHaveBeenCalledWith(
      '/v1/companies/c1%2F2/beneficiaries',
      expect.objectContaining({ method: 'POST' }),
    )
    vi.unstubAllGlobals()
  })

  it('sends the session bearer token when creating a beneficiary', async () => {
    saveAccessToken('token-value')
    const mock = vi.fn(async () => new Response(JSON.stringify({ id: 'b3' }), { status: 201 }))
    vi.stubGlobal('fetch', mock)

    await createBeneficiary('c1', {
      beneficiaryType: 'LEGAL_ENTITY',
      legalName: 'X',
      identificationDocument: 'Y',
      country: 'Brasil',
      address: 'Z',
      confirmed: true,
      receivingMethod: 'BANK_ACCOUNT',
      nickname: 'X',
    })

    expect(mock).toHaveBeenCalledWith(
      '/v1/companies/c1/beneficiaries',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-value' }),
      }),
    )
    vi.unstubAllGlobals()
  })

  it('throws an ApiError when creation fails', async () => {
    const mock = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: 'Empresa não verificada' }), { status: 403 }),
    )
    vi.stubGlobal('fetch', mock)

    await expect(
      createBeneficiary('c1', {
        beneficiaryType: 'Pessoa jurídica',
        legalName: 'X',
        identificationDocument: 'Y',
        country: 'Brasil',
        address: 'Z',
        confirmed: true,
        receivingMethod: 'BANK_ACCOUNT',
        nickname: 'X',
      }),
    ).rejects.toBeInstanceOf(ApiError)
    vi.unstubAllGlobals()
  })
})
