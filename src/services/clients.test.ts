import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { saveAccessToken } from './authToken'
import { getClients, toCliente, type CompanySummary } from './clients'

const summary: CompanySummary = {
  id: 'c1',
  legalName: 'Empresa Legal Ltda',
  tradeName: null,
  cnpj: '11222333000181',
  city: 'Porto Alegre',
  state: 'RS',
  statusKyb: 'APPROVED',
  statusAml: 'UNDER_REVIEW',
  overallStatus: 'UNDER_REVIEW',
  representativeId: 'u1',
  representativeName: 'Maria Souza',
  representativeEmail: 'maria@empresa.com',
  createdAt: '2026-09-01T10:00:00Z',
  updatedAt: '2026-09-15T12:00:00Z',
}

describe('getClients', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('loads company summaries with the admin bearer token and adapts them', async () => {
    saveAccessToken('admin-token')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [summary] })
    vi.stubGlobal('fetch', fetchMock)

    await expect(getClients()).resolves.toEqual([
      {
        id: 'c1',
        empresa: 'Empresa Legal Ltda',
        cnpj: '11.222.333/0001-81',
        cidade: 'Porto Alegre / RS',
        atualizacao: '15/09/2026',
        responsavel: 'Maria Souza',
        status: 'Em análise',
      },
    ])
    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/companies/summaries',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }),
      }),
    )
  })

  it('keeps an empty list empty (no mock fallback)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }))

    await expect(getClients()).resolves.toEqual([])
  })

  it('propagates request failures instead of returning mock data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }),
    )

    await expect(getClients()).rejects.toMatchObject({ status: 403 })
  })

  it('propagates network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')))

    await expect(getClients()).rejects.toThrow('Network down')
  })
})

describe('toCliente', () => {
  it('handles missing city, representative and dates safely', () => {
    expect(
      toCliente({
        ...summary,
        tradeName: 'Nome Fantasia',
        city: null,
        state: null,
        representativeName: null,
        updatedAt: null,
        createdAt: null,
        overallStatus: 'REJECTED',
      }),
    ).toMatchObject({
      empresa: 'Nome Fantasia',
      cidade: '—',
      responsavel: '—',
      atualizacao: '',
      status: 'Rejeitado',
    })
  })
})
