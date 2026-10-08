import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QuoteRequest, QuoteResponse } from '@/types/quote'
import { createQuote, QuoteServiceError } from './quotes'

const request: QuoteRequest = {
  beneficiaryId: '0a2a3dba-9f88-4ff6-8247-fcab8be85f86',
  direction: 'PAYOUT',
  sourceCurrency: 'BRL',
  targetCurrency: 'USD',
  sourcePaymentMethod: 'pix',
  targetPaymentMethod: 'international_swift',
  amount: 1000.5,
  amountSide: 'SOURCE',
  token: 'USDC',
  blockchainNetwork: 'polygon',
  coverFees: false,
  description: 'Invoice 123',
}

const validResponse: QuoteResponse = {
  quoteRequestId: '49960b31-3ef9-486f-a1b7-2dac8436c9f1',
  offer: {
    offerId: '277ba36d-ac63-4315-bb09-8a40fbd1b879',
    sourceAmount: 1000.5,
    targetAmount: 180.25,
    exchangeRate: 0.18015992004,
    totalFee: 3.5,
    expiresAt: '2026-10-07T18:30:00Z',
  },
}

function authenticated(): void {
  localStorage.setItem('token', 'jwt-access-token')
}

function mockSuccessfulFetch(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(validResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('quotes service', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the backend URL handled by the Vite proxy', async () => {
    authenticated()
    const fetchMock = mockSuccessfulFetch()

    await createQuote(request)

    expect(fetchMock).toHaveBeenCalledWith('/v1/quotes', expect.any(Object))
  })

  it('uses the POST method', async () => {
    authenticated()
    const fetchMock = mockSuccessfulFetch()

    await createQuote(request)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('serializes the complete request payload as JSON', async () => {
    authenticated()
    const fetchMock = mockSuccessfulFetch()

    await createQuote(request)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify(request) }),
    )
  })

  it('sends the login JWT as a Bearer token', async () => {
    authenticated()
    const fetchMock = mockSuccessfulFetch()

    await createQuote(request)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer jwt-access-token',
          'Content-Type': 'application/json',
        },
      }),
    )
  })

  it('rejects before making a request when the login JWT is absent', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(createQuote(request)).rejects.toMatchObject({
      code: 'MISSING_AUTH_TOKEN',
      status: 401,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns a valid HTTP 200 response without changing the selected offer', async () => {
    authenticated()
    mockSuccessfulFetch()

    await expect(createQuote(request)).resolves.toEqual(validResponse)
  })

  it('accepts a quote without an expiration date', async () => {
    authenticated()
    const responseWithoutExpiration = {
      ...validResponse,
      offer: { ...validResponse.offer, expiresAt: null },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(responseWithoutExpiration), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(createQuote(request)).resolves.toEqual(responseWithoutExpiration)
  })

  it('rejects a structurally invalid response at runtime', async () => {
    authenticated()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            quoteRequestId: validResponse.quoteRequestId,
            offer: { ...validResponse.offer, totalFee: '3.50' },
          }),
          { status: 200 },
        ),
      ),
    )

    await expect(createQuote(request)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    })
  })

  it.each([
    [400, 'A solicitação de cotação é inválida.'],
    [401, 'É necessário entrar novamente para solicitar uma cotação.'],
    [404, 'A empresa ou o beneficiário informado não foi encontrado.'],
    [422, 'Nenhuma cotação está disponível para a operação solicitada.'],
    [500, 'O serviço de cotações está temporariamente indisponível.'],
    [503, 'O serviço de cotações está temporariamente indisponível.'],
  ])('returns a typed error for HTTP %i', async (status, message) => {
    authenticated()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })))

    await expect(createQuote(request)).rejects.toMatchObject({
      name: 'QuoteServiceError',
      code: 'HTTP_ERROR',
      status,
      message,
    })
  })

  it('uses a safe generic message for an unexpected HTTP status', async () => {
    authenticated()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ message: 'sensitive provider detail' }), { status: 418 }),
        ),
    )

    await expect(createQuote(request)).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      status: 418,
      message: 'Não foi possível solicitar a cotação.',
    })
  })

  it('returns a typed and sanitized error when the connection fails', async () => {
    authenticated()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch internal URL')))

    await expect(createQuote(request)).rejects.toEqual(
      expect.objectContaining({
        name: 'QuoteServiceError',
        code: 'NETWORK_ERROR',
        message: 'Não foi possível conectar ao serviço de cotações.',
      }),
    )
  })

  it('exposes service failures as QuoteServiceError instances', async () => {
    authenticated()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))

    await expect(createQuote(request)).rejects.toBeInstanceOf(QuoteServiceError)
  })
})
