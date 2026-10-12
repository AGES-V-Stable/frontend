import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { saveAccessToken } from './authToken'
import { createTransfer, getTransferQuote, getTransfers, getTransfersById } from './transfers'

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

  it('envia todos os parâmetros de filtro quando preenchidos', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) })

    await getTransfers(1, 3, {
      beneficiary: 'Atlas',
      startDate: '2026-08-16',
      endDate: '2026-08-22',
      minAmount: '5000',
      maxAmount: '15000',
      type: 'Recebimento',
    })

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(calledUrl).toContain('beneficiary=Atlas')
    expect(calledUrl).toContain('startDate=2026-08-16')
    expect(calledUrl).toContain('endDate=2026-08-22')
    expect(calledUrl).toContain('minAmount=5000')
    expect(calledUrl).toContain('maxAmount=15000')
    expect(calledUrl).toContain('type=Recebimento')
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
      expect.any(Object),
    )
  })

  it('deve disparar um erro se a API falhar (sem fallback)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false })

    await expect(getTransfersById('t99')).rejects.toThrow(
      'Falha ao buscar detalhes da transferência',
    )
  })

  it('deve disparar um erro se a API retornar formato inválido', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ algoErrado: true }),
    })

    await expect(getTransfersById('t99')).rejects.toThrow('Formato inválido retornado pela API')
  })
})

const quoteResponse = {
  source: { amount: 125000, currency: 'BRL' },
  destination: { amount: 24235.14, currency: 'USD' },
  exchangeRate: { fromCurrency: 'USD', toCurrency: 'BRL', rate: 5.16 },
  fee: { percentage: 0.45, amount: 562.5, currency: 'BRL' },
  total: { amount: 125562.5, currency: 'BRL' },
}

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
})

const sentRequest = (fetchMock: ReturnType<typeof vi.fn>) => {
  const [url, options] = fetchMock.mock.calls[0]! as [string, RequestInit]
  return { url, options, body: JSON.parse(options.body as string) as Record<string, unknown> }
}

describe('getTransferQuote service', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('consulta POST /v1/transfers/quote com o lado editado e devolve a cotação do backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(quoteResponse))
    vi.stubGlobal('fetch', fetchMock)

    const result = await getTransferQuote({
      amount: 125000,
      amountType: 'SOURCE',
      sourceCurrency: 'BRL',
      destinationCurrency: 'USD',
    })

    const { url, options, body } = sentRequest(fetchMock)
    expect(url).toBe('/v1/transfers/quote')
    expect(options.method).toBe('POST')
    expect(body).toEqual({
      amount: 125000,
      amountType: 'SOURCE',
      sourceCurrency: 'BRL',
      destinationCurrency: 'USD',
    })
    expect(result).toEqual(quoteResponse)
  })

  it('envia só amount e amountType quando as moedas não são informadas', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(quoteResponse))
    vi.stubGlobal('fetch', fetchMock)

    await getTransferQuote({ amount: 24235.14, amountType: 'DESTINATION' })

    expect(sentRequest(fetchMock).body).toEqual({ amount: 24235.14, amountType: 'DESTINATION' })
  })

  it('envia o token Bearer e repassa o AbortSignal para cancelar a consulta anterior', async () => {
    saveAccessToken('token-abc')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(quoteResponse))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await getTransferQuote({ amount: 10, amountType: 'SOURCE' }, controller.signal)

    const { options } = sentRequest(fetchMock)
    expect(options.headers).toMatchObject({ Authorization: 'Bearer token-abc' })
    expect(options.signal).toBe(controller.signal)
  })

  it('rejeita cotação incompleta em vez de exibir valores parciais', async () => {
    const withoutFee = { ...quoteResponse, fee: undefined }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(withoutFee)))

    await expect(getTransferQuote({ amount: 10, amountType: 'SOURCE' })).rejects.toThrow(
      'Formato inválido retornado pela API',
    )
  })

  it('propaga o status HTTP do backend quando a cotação falha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ message: 'Usuário sem KYC associado' }, 422)),
    )

    await expect(getTransferQuote({ amount: 10, amountType: 'SOURCE' })).rejects.toMatchObject({
      name: 'HttpError',
      status: 422,
    })
  })
})

describe('createTransfer service', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const createRequest = {
    amount: 125000,
    amountType: 'SOURCE' as const,
    sourceCurrency: 'BRL',
    destinationCurrency: 'USD',
    paymentMethod: 'ACCOUNT_BALANCE' as const,
    beneficiaryId: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Pagamento de importação',
  }

  it('cria a transferência via POST /v1/transfers e devolve o status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'PROCESSING' }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await createTransfer(createRequest)

    const { url, options, body } = sentRequest(fetchMock)
    expect(url).toBe('/v1/transfers')
    expect(options.method).toBe('POST')
    expect(body).toEqual(createRequest)
    expect(result).toEqual({ status: 'PROCESSING' })
  })

  it('não envia nenhum dado de cotação, mesmo que o objeto recebido tenha campos extras', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'PROCESSING' }))
    vi.stubGlobal('fetch', fetchMock)
    const requestWithQuoteData = { ...createRequest, quoteId: 'q-1', quoteToken: 't-1' }

    await createTransfer(requestWithQuoteData)

    const { body } = sentRequest(fetchMock)
    expect(body).not.toHaveProperty('quoteId')
    expect(body).not.toHaveProperty('quoteToken')
    expect(body).not.toHaveProperty('ticketId')
  })

  it('rejeita status desconhecido retornado pela API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status: 'UNKNOWN' })))

    await expect(createTransfer(createRequest)).rejects.toThrow(
      'Formato inválido retornado pela API',
    )
  })

  it('propaga 404 quando o beneficiário não é encontrado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ message: 'Beneficiário não encontrado' }, 404)),
    )

    await expect(createTransfer(createRequest)).rejects.toMatchObject({ status: 404 })
  })
})
