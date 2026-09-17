import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getTransfers } from './transfers'
import { mockTransfers } from '@/data/mockTransfers'

describe('getTransfers service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('deve retornar os dados da API com sucesso quando o fetch funciona', async () => {
    const mockApiResponse = {
      data: [{ id: 'fake1', empresa: 'Empresa Teste API' }],
      totalItems: 1,
      totalPages: 1,
      currentPage: 1
    }
    
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    })

    const result = await getTransfers(1, 3)
    
    expect(result).toEqual(mockApiResponse)
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('page=1&limit=3'), expect.any(Object))
  })

  it('deve acionar o fallback para dados mockados caso a resposta da API não seja OK', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false }) // Simula API caindo ou retornando 404/500

    const result = await getTransfers(1, 3)
    
    // Como limit é 3, ele deve fatiar e retornar 3 itens
    expect(result.data).toHaveLength(3) 
    expect(result.totalItems).toBe(mockTransfers.length)
    expect(result.currentPage).toBe(1)
  })

  it('deve acionar o fallback e processar a paginação corretamente (Página 2)', async () => {
    // Simula erro bruto de rede (ECONNREFUSED, etc)
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const limit = 2
    const page = 2
    const result = await getTransfers(page, limit)
    
    expect(result.data).toHaveLength(2)
    expect(result.currentPage).toBe(2)
    // O primeiro da página 2 (índice 2) deve bater com o 3º item do mock geral
    expect(result.data[0].id).toBe(mockTransfers[2].id)
  })
  
  it('deve acionar o fallback se a API responder com formato json inválido/inesperado', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ algoErrado: true }) // Não tem o array "data" esperado
    })
    
    const result = await getTransfers(1, 3)
    
    // Caiu no catch e retornou o mock local
    expect(result.totalItems).toBe(mockTransfers.length)
  })
})

