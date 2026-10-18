import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { saveAccessToken } from '@/shared/http/authToken'
import {
  createTransfer,
  getTransferQuote,
  getTransfers,
  getTransfersById,
} from '@/features/transfers/api/transfers'

const historyRow = {
  id: 't1',
  companyName: 'Empresa',
  counterpartyName: 'Atlas',
  createdAt: '2026-10-01T12:00:00Z',
  direction: 'PAYMENT',
  foreignAmount: '123456789012345.67',
  foreignCurrency: 'USD',
  status: 'SETTLED',
  exchangeRate: '5.42',
  serviceFeeBrl: null,
}
describe('admin history contracts', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })
  it('adapts authenticated Spring pagination, filter enums and decimal strings', async () => {
    saveAccessToken('token')
    const mock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ content: [historyRow], totalElements: 13, totalPages: 2, number: 1 }),
        ),
      )
    vi.stubGlobal('fetch', mock)
    const result = await getTransfers(2, 12, {
      status: 'Concluída',
      type: 'Pagamento',
      search: 'Empresa',
    })
    expect(result).toMatchObject({
      currentPage: 2,
      totalItems: 13,
      data: [{ valor: '123456789012345.67', status: 'Concluída', tipo: 'Pagamento' }],
    })
    expect(mock).toHaveBeenCalledWith(
      '/v1/transfers?page=1&size=12&status=SETTLED&direction=PAYMENT&search=Empresa',
      expect.objectContaining({ headers: { Authorization: 'Bearer token' } }),
    )
  })
  it('loads encoded administrator transfer details', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(historyRow)))
    vi.stubGlobal('fetch', mock)
    expect((await getTransfersById('a/b')).cotacao).toBe('5.42')
    expect(mock.mock.calls[0][0]).toBe('/v1/transfers/a%2Fb')
  })
  it('preserves empty history', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('{"content":[],"totalElements":0,"totalPages":0,"number":0}'),
        ),
    )
    expect((await getTransfers()).data).toEqual([])
  })
  it('rejects malformed history', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"data":[]}')))
    await expect(getTransfers()).rejects.toThrow()
  })
  it.each([401, 403, 500])('preserves HTTP %s errors', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })))
    await expect(getTransfers()).rejects.toMatchObject({ status })
  })
  it('forwards read cancellation', async () => {
    const controller = new AbortController()
    controller.abort()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')))
    await expect(getTransfers(1, 12, {}, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
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
