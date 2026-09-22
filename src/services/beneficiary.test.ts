import { afterEach, describe, expect, it, vi } from 'vitest'

import { getBeneficiaries, getBeneficiary } from './beneficiary'

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
})
