import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { saveAccessToken } from '@/shared/http/authToken'
import {
  confirmOffer,
  confirmRequote,
  createQuote,
  getTransferExecution,
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

const OFFER_ID = '7d7f2a54-8f0b-4c1e-9f0e-3c2a1b0d9e8f'
const EXECUTION_ID = '0b1c2d3e-4f50-4617-8293-a4b5c6d7e8f9'

const quoteResponse = {
  quoteRequestId: '1a2b3c4d-5e6f-4789-8abc-def012345678',
  offer: {
    offerId: OFFER_ID,
    sourceAmount: 1000,
    targetAmount: 182.45,
    exchangeRate: 0.18245,
    totalFee: 3.1,
    expiresAt: '2026-11-10T23:59:00Z',
    provider: 'BLINDPAY',
  },
}

const execution = {
  executionId: EXECUTION_ID,
  offerId: OFFER_ID,
  transactionId: null,
  provider: 'BLINDPAY',
  status: 'AWAITING_FUNDS',
  source: { amount: 1000, currency: 'BRL' },
  target: { amount: 182.45, currency: 'USD' },
  totalFee: 3.1,
  fundingInstructions: '00020126580014br.gov.bcb.pix',
  requote: null,
  failureCode: null,
  createdAt: '2026-11-10T23:50:00Z',
  updatedAt: '2026-11-10T23:50:00Z',
}

const quoteRequest = {
  beneficiaryId: '550e8400-e29b-41d4-a716-446655440000',
  direction: 'PAYOUT' as const,
  sourceCurrency: 'BRL',
  targetCurrency: 'USD',
  sourcePaymentMethod: 'PIX' as const,
  targetPaymentMethod: 'international_swift',
  amount: 1000,
  amountSide: 'SOURCE' as const,
  coverFees: false,
}

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
})

const sentRequest = (fetchMock: ReturnType<typeof vi.fn>) => {
  const [url, options] = fetchMock.mock.calls[0]! as [string, RequestInit]
  return {
    url,
    options,
    body: options.body ? (JSON.parse(options.body as string) as Record<string, unknown>) : null,
  }
}

describe('quote and execution services', () => {
  beforeEach(() => {
    sessionStorage.clear()
    saveAccessToken('token-abc')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('given a filled form, when quoting, then it posts the request to /v1/quotes and returns the best offer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(quoteResponse))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    const result = await createQuote(quoteRequest, controller.signal)

    const { url, options, body } = sentRequest(fetchMock)
    expect(url).toBe('/v1/quotes')
    expect(options.method).toBe('POST')
    expect(options.signal).toBe(controller.signal)
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer token-abc')
    // Token e rede intermediários ficam por conta da configuração do backend.
    expect(body).toEqual(quoteRequest)
    expect(result).toEqual(quoteResponse)
  })

  it('given an incomplete offer, when quoting, then it rejects instead of showing partial values', async () => {
    const offerWithoutProvider: Partial<typeof quoteResponse.offer> = { ...quoteResponse.offer }
    delete offerWithoutProvider.provider
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ ...quoteResponse, offer: offerWithoutProvider })),
    )

    await expect(createQuote(quoteRequest)).rejects.toThrow('Formato inválido retornado pela API')
  })

  it('given no eligible provider, when quoting, then it propagates the HTTP status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ message: 'No quote available' }, 422)),
    )

    await expect(createQuote(quoteRequest)).rejects.toMatchObject({ status: 422 })
  })

  it('given an offer, when confirming, then it sends only the displayed amounts to the offer URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(execution))
    vi.stubGlobal('fetch', fetchMock)

    const result = await confirmOffer(OFFER_ID, { sourceAmount: 1000, targetAmount: 182.45 })

    const { url, options, body } = sentRequest(fetchMock)
    expect(url).toBe(`/v1/quotes/offers/${OFFER_ID}/confirm`)
    expect(options.method).toBe('POST')
    expect(body).toEqual({ sourceAmount: 1000, targetAmount: 182.45 })
    expect(result.status).toBe('AWAITING_FUNDS')
    expect(result.fundingInstructions).toBe('00020126580014br.gov.bcb.pix')
  })

  it('given an unknown execution status, when confirming, then it rejects the response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ ...execution, status: 'DONE' })),
    )

    await expect(
      confirmOffer(OFFER_ID, { sourceAmount: 1000, targetAmount: 182.45 }),
    ).rejects.toThrow('Formato inválido retornado pela API')
  })

  it('given an execution, when polling, then it reads it with cancellation support', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ...execution, status: 'COMPLETED' }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    const result = await getTransferExecution(EXECUTION_ID, controller.signal)

    const { url, options } = sentRequest(fetchMock)
    expect(url).toBe(`/v1/transfer-executions/${EXECUTION_ID}`)
    expect(options.signal).toBe(controller.signal)
    expect(result.status).toBe('COMPLETED')
  })

  it('given a requote, when accepting it, then it posts the new amounts to the requote URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ...execution, status: 'FUNDS_RECEIVED' }))
    vi.stubGlobal('fetch', fetchMock)

    await confirmRequote(EXECUTION_ID, { sourceAmount: 1000, targetAmount: 180.1 })

    const { url, options, body } = sentRequest(fetchMock)
    expect(url).toBe(`/v1/transfer-executions/${EXECUTION_ID}/requote/confirm`)
    expect(options.method).toBe('POST')
    expect(body).toEqual({ sourceAmount: 1000, targetAmount: 180.1 })
  })
})
