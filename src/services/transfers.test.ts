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
      currentPage: 1,
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    })

    const result = await getTransfers(1, 3)

    expect(result).toEqual(mockApiResponse)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('page=1&limit=3'),
      expect.any(Object),
    )
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
      json: async () => ({ algoErrado: true }), // Não tem o array "data" esperado
    })

    const result = await getTransfers(1, 3)

    // Caiu no catch e retornou o mock local
    expect(result.totalItems).toBe(mockTransfers.length)
  })

  it('não envia parâmetros de filtro vazios pra API', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) })

    await getTransfers(1, 3, {
      search: '',
      beneficiary: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      status: '',
      type: '',
    })

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(calledUrl).toBe('/api/transfers?page=1&limit=3')
  })

  it('envia somente os parâmetros de filtro preenchidos', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) })

    await getTransfers(1, 3, { search: 'Tech Corp', status: 'Concluída' })

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(calledUrl).toContain('search=Tech+Corp')
    expect(calledUrl).toContain('status=Conclu%C3%ADda')
    expect(calledUrl).not.toContain('beneficiary=')
  })

  it('fallback filtra por empresa (busca por texto)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const result = await getTransfers(1, 10, { search: 'Tech Corp' })

    expect(result.totalItems).toBe(3)
    expect(result.data.every((transfer) => transfer.empresa === 'Tech Corp')).toBe(true)
  })

  it('fallback filtra por beneficiário (busca por texto)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const result = await getTransfers(1, 10, { beneficiary: 'Atlas' })

    expect(result.totalItems).toBe(1)
    expect(result.data[0].id).toBe('t1')
  })

  it('fallback filtra por status', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const result = await getTransfers(1, 10, { status: 'Concluída' })

    expect(result.totalItems).toBe(4)
    expect(result.data.every((transfer) => transfer.status === 'Concluída')).toBe(true)
  })

  it('fallback filtra por tipo', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const result = await getTransfers(1, 10, { type: 'Recebimento' })

    expect(result.totalItems).toBe(2)
    expect(result.data.every((transfer) => transfer.tipo === 'Recebimento')).toBe(true)
  })

  it('fallback filtra por intervalo de datas', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const result = await getTransfers(1, 10, { startDate: '2026-08-16', endDate: '2026-08-22' })

    expect(result.totalItems).toBe(2)
    expect(result.data.map((transfer) => transfer.id).sort()).toEqual(['t2', 't3'])
  })

  it('fallback filtra por faixa de valor', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const result = await getTransfers(1, 10, { minAmount: '5000', maxAmount: '15000' })

    expect(result.totalItems).toBe(3)
    expect(result.data.map((transfer) => transfer.id).sort()).toEqual(['t2', 't3', 't4'])
  })

  it('fallback combina múltiplos filtros', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const result = await getTransfers(1, 10, { search: 'Tech Corp', type: 'Recebimento' })

    expect(result.totalItems).toBe(1)
    expect(result.data[0].id).toBe('t3')
  })

  it('fallback pagina corretamente sobre o subconjunto já filtrado', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const result = await getTransfers(2, 2, { search: 'Tech Corp' })

    expect(result.totalItems).toBe(3)
    expect(result.totalPages).toBe(2)
    expect(result.currentPage).toBe(2)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe('t6')
  })
})
