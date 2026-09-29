import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getTransfers, getTransfersById } from './transfers'

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

  it('deve disparar um erro se a resposta da API não for OK (sem fallback)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false })

    await expect(getTransfers(1, 3)).rejects.toThrow('Falha ao buscar transferências da API')
  })

  it('deve disparar erro de rede se a API estiver fora do ar (sem fallback)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    await expect(getTransfers(1, 3)).rejects.toThrow('Network failure')
  })

  it('deve disparar um erro se a API responder com formato json inválido', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ algoErrado: true }),
    })

    await expect(getTransfers(1, 3)).rejects.toThrow('Formato inválido retornado pela API')
  })
})

describe('getTransfersById service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('deve retornar os dados da API com sucesso', async () => {
    const mockApiResponse = { id: 't99', empresa: 'Empresa Teste ID' }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    })

    const result = await getTransfersById('t99')

    expect(result).toEqual(mockApiResponse)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/transfers/t99'),
      expect.any(Object)
    )
  })

  it('deve disparar um erro se a API falhar (sem fallback)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false })

    await expect(getTransfersById('t99')).rejects.toThrow('Falha ao buscar detalhes da transferência')
  })

  it('deve disparar um erro se a API retornar formato inválido', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ algoErrado: true }),
    })

    await expect(getTransfersById('t99')).rejects.toThrow('Formato inválido retornado pela API')
  })
})

