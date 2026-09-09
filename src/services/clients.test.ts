import { afterEach, describe, expect, it, vi } from 'vitest'

import { mockClients } from '@/data/mockClients'
import { getClients } from './clients'

describe('getClients', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the list from the API when the response contains an array', async () => {
    const apiClients = [
      {
        id: '9',
        empresa: 'Empresa API',
        cnpj: '11.222.333/0001-44',
        cidade: 'São Paulo / SP',
        atualizacao: '05/09/2024',
        responsavel: 'Ana Lima',
        status: 'Ativa',
      },
    ]

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => apiClients,
      }),
    )

    await expect(getClients()).resolves.toEqual(apiClients)
    expect(fetch).toHaveBeenCalledWith('/api/clients', {
      headers: {
        Accept: 'application/json',
      },
    })
  })

  it('returns the list from data when the API wraps clients in a data property', async () => {
    const apiClients = [
      {
        id: '10',
        empresa: 'Empresa Data',
        cnpj: '77.888.999/0001-66',
        cidade: 'Curitiba / PR',
        atualizacao: '06/09/2024',
        responsavel: 'Bruno Costa',
        status: 'Em análise',
      },
    ]

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: apiClients }),
      }),
    )

    await expect(getClients()).resolves.toEqual(apiClients)
  })

  it('returns the list from results when the API wraps clients in a results property', async () => {
    const apiClients = [
      {
        id: '11',
        empresa: 'Empresa Results',
        cnpj: '55.666.777/0001-88',
        cidade: 'Porto Alegre / RS',
        atualizacao: '07/09/2024',
        responsavel: 'Cátia Rocha',
        status: 'Ativa',
      },
    ]

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: apiClients }),
      }),
    )

    await expect(getClients()).resolves.toEqual(apiClients)
  })

  it('falls back to mockClients when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    )

    await expect(getClients()).resolves.toEqual(mockClients)
  })

  it('falls back to mockClients when the API returns an empty payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      }),
    )

    await expect(getClients()).resolves.toEqual(mockClients)
  })

  it('falls back to mockClients when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    await expect(getClients()).resolves.toEqual(mockClients)
  })
})
