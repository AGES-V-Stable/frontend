import { z } from 'zod'

import type { QuoteRequest, QuoteResponse } from '@/types/quote'

const QUOTES_ENDPOINT = '/v1/quotes'
const LOGIN_TOKEN_KEY = 'token'

const quoteOfferSchema = z.object({
  offerId: z.string().uuid(),
  sourceAmount: z.number().finite(),
  targetAmount: z.number().finite(),
  exchangeRate: z.number().finite(),
  totalFee: z.number().finite(),
  expiresAt: z.string().datetime({ offset: true }).nullable(),
})

const quoteResponseSchema = z.object({
  quoteRequestId: z.string().uuid(),
  offer: quoteOfferSchema,
})

export type QuoteServiceErrorCode =
  'MISSING_AUTH_TOKEN' | 'HTTP_ERROR' | 'INVALID_RESPONSE' | 'NETWORK_ERROR'

export class QuoteServiceError extends Error {
  readonly code: QuoteServiceErrorCode
  readonly status?: number

  constructor(message: string, code: QuoteServiceErrorCode, status?: number) {
    super(message)
    this.name = 'QuoteServiceError'
    this.code = code
    this.status = status
  }
}

function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'A solicitação de cotação é inválida.'
    case 401:
      return 'É necessário entrar novamente para solicitar uma cotação.'
    case 404:
      return 'A empresa ou o beneficiário informado não foi encontrado.'
    case 422:
      return 'Nenhuma cotação está disponível para a operação solicitada.'
    case 500:
    case 503:
      return 'O serviço de cotações está temporariamente indisponível.'
    default:
      return 'Não foi possível solicitar a cotação.'
  }
}

export async function createQuote(payload: QuoteRequest): Promise<QuoteResponse> {
  const token = localStorage.getItem(LOGIN_TOKEN_KEY)?.trim()
  if (!token) {
    throw new QuoteServiceError(
      'É necessário estar autenticado para solicitar uma cotação.',
      'MISSING_AUTH_TOKEN',
      401,
    )
  }

  let response: Response
  try {
    response = await fetch(QUOTES_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new QuoteServiceError(
      'Não foi possível conectar ao serviço de cotações.',
      'NETWORK_ERROR',
    )
  }

  if (!response.ok) {
    throw new QuoteServiceError(messageForStatus(response.status), 'HTTP_ERROR', response.status)
  }

  const body: unknown = await response.json().catch(() => undefined)
  const parsed = quoteResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new QuoteServiceError(
      'O serviço de cotações retornou uma resposta inválida.',
      'INVALID_RESPONSE',
    )
  }

  return parsed.data
}
