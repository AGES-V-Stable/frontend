import { afterEach, describe, expect, it, vi } from 'vitest'

import { getBeneficiaries, getBeneficiary, createBeneficiary } from './beneficiary'
import { ApiError } from './registration'
import type { BeneficiaryCreatePayload } from './beneficiary'

const beneficiary = {
  id: '1',
  nome: 'Maria Oliveira',
  empresa: 'Cooperativa AgroSul',
  cnpj: '45.123.456/0001-90',
  country: 'Brasil',
  currency: 'BRL',
  status: 'Ativo',
}

describe('beneficiary service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('loads a list returned as an array with the bearer token', async () => {
    localStorage.setItem('token', 'token-value')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [beneficiary] }))

    await expect(getBeneficiaries()).resolves.toEqual([beneficiary])
    expect(fetch).toHaveBeenCalledWith('/api/beneficiaries', {
      headers: { Accept: 'application/json', Authorization: 'Bearer token-value' },
    })
  })

  it('normalizes data and results list envelopes', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [beneficiary] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [beneficiary] }) }),
    )

    await expect(getBeneficiaries()).resolves.toEqual([beneficiary])
    await expect(getBeneficiaries()).resolves.toEqual([beneficiary])
  })

  it('returns an empty list for a valid empty payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }),
    )

    await expect(getBeneficiaries()).resolves.toEqual([])
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

  it('creates a bank-account beneficiary via POST /v1/companies/{companyId}/beneficiaries', async () => {
    const payload: BeneficiaryCreatePayload = {
      tipoBeneficiario: 'Pessoa jurídica',
      nomeCompleto: 'João da Silva Comércio Ltda.',
      documentoFiscal: '12345678000190',
      pais: 'Brasil',
      endereco: 'Rua A, 100',
      metodoRecebimento: 'conta_bancaria',
      banco: 'Banco XYZ',
      swiftBic: 'BOFAUS3N',
      ibanNumeroConta: 'BR1800000000141455970000123456',
      moedaRecebimento: 'USD',
      apelido: 'Fornecedor principal',
    }
    const mock = vi.fn(async () => new Response(JSON.stringify({ id: 'b1' }), { status: 201 }))
    vi.stubGlobal('fetch', mock)

    await expect(createBeneficiary('c1', payload)).resolves.toEqual({ id: 'b1' })
    expect(mock).toHaveBeenCalledWith(
      '/v1/companies/c1/beneficiaries',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    )
    vi.unstubAllGlobals()
  })

  it('creates a wallet beneficiary and encodes the companyId', async () => {
    const payload: BeneficiaryCreatePayload = {
      tipoBeneficiario: 'Pessoa jurídica',
      nomeCompleto: 'João da Silva Comércio Ltda.',
      documentoFiscal: '12345678000190',
      pais: 'Brasil',
      endereco: 'Rua A, 100',
      metodoRecebimento: 'wallet_cripto',
      enderecoWallet: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      redeBlockchain: 'Polygon',
      apelido: 'Fornecedor principal',
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

  it('throws an ApiError when creation fails', async () => {
    const mock = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: 'Empresa não verificada' }), { status: 403 }),
    )
    vi.stubGlobal('fetch', mock)

    await expect(
      createBeneficiary('c1', {
        tipoBeneficiario: 'Pessoa jurídica',
        nomeCompleto: 'X',
        documentoFiscal: 'Y',
        pais: 'Brasil',
        endereco: 'Z',
        metodoRecebimento: 'conta_bancaria',
        apelido: 'X',
      }),
    ).rejects.toBeInstanceOf(ApiError)
    vi.unstubAllGlobals()
  })
})
