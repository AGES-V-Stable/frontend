import { z } from 'zod'
import type { Transfer } from '../types/transferHistory'
import { QuoteResponseSchema, TransferExecutionSchema } from '../schemas/transfer'
import type {
  ConfirmOfferRequest,
  QuoteRequest,
  QuoteResponse,
  TransferExecution,
} from '../types/transfer'
import { httpRequest } from '@/shared/http/httpClient'

export interface GetTransfersResponse {
  data: Transfer[]
  totalItems: number
  totalPages: number
  currentPage: number
}
export interface TransferFilterParams {
  search?: string
  beneficiary?: string
  startDate?: string
  endDate?: string
  minAmount?: string
  maxAmount?: string
  status?: string
  type?: string
}
const decimal = z.string().regex(/^-?\d+(\.\d+)?$/)
const TransferSchema = z.object({
  id: z.string(),
  companyName: z.string().nullable(),
  counterpartyName: z.string().nullable(),
  createdAt: z.string(),
  direction: z.enum(['PAYMENT', 'RECEIPT']).nullable(),
  foreignAmount: decimal.nullable(),
  foreignCurrency: z.string().nullable(),
  status: z.string(),
  exchangeRate: decimal.nullable(),
  serviceFeeBrl: decimal.nullable(),
})
export const transferStatusLabels: Record<string, string> = {
  AWAITING_PAYMENT: 'Aguardando pagamento',
  PROCESSING: 'Processando',
  HELD: 'Retida',
  SETTLED: 'Concluída',
  FAILED: 'Falha',
  PARTIAL_FAILURE: 'Falha parcial',
  CANCELED: 'Cancelada',
  EXPIRED: 'Expirada',
}
function toTransfer(item: z.infer<typeof TransferSchema>): Transfer {
  return {
    id: item.id,
    empresa: item.companyName ?? 'Não disponível',
    beneficiario: item.counterpartyName ?? 'Não disponível',
    data: item.createdAt,
    tipo: item.direction === 'RECEIPT' ? 'Recebimento' : 'Pagamento',
    valor: item.foreignAmount,
    moeda: item.foreignCurrency ?? 'BRL',
    status: transferStatusLabels[item.status] ?? item.status,
    cotacao: item.exchangeRate,
    custos: item.serviceFeeBrl,
  }
}
export async function getTransfers(
  page = 1,
  limit = 12,
  filters?: TransferFilterParams,
  signal?: AbortSignal,
): Promise<GetTransfersResponse> {
  const params = new URLSearchParams({ page: String(Math.max(0, page - 1)), size: String(limit) })
  for (const [key, value] of Object.entries(filters ?? {}))
    if (value) {
      if (key === 'type') params.set('direction', value === 'Pagamento' ? 'PAYMENT' : 'RECEIPT')
      else if (key === 'status')
        params.set(
          key,
          Object.entries(transferStatusLabels).find(([, label]) => label === value)?.[0] ?? value,
        )
      else params.set(key, value)
    }
  const parsed = z
    .object({
      content: z.array(TransferSchema),
      totalElements: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
      number: z.number().int().nonnegative(),
    })
    .parse(await httpRequest<unknown>(`/v1/transfers?${params}`, { signal }))
  return {
    data: parsed.content.map(toTransfer),
    totalItems: parsed.totalElements,
    totalPages: Math.max(1, parsed.totalPages),
    currentPage: parsed.number + 1,
  }
}
export async function getTransfersById(id: string, signal?: AbortSignal): Promise<Transfer> {
  return toTransfer(
    TransferSchema.parse(
      await httpRequest<unknown>(`/v1/transfers/${encodeURIComponent(id)}`, { signal }),
    ),
  )
}

const INVALID_RESPONSE_MESSAGE = 'Formato inválido retornado pela API'

const parseExecution = (payload: unknown): TransferExecution => {
  const execution = TransferExecutionSchema.safeParse(payload)
  if (!execution.success) throw new Error(INVALID_RESPONSE_MESSAGE)
  return execution.data
}

/**
 * Cota nos provedores elegíveis e devolve a melhor oferta; não cria transferência.
 * O `signal` cancela a consulta anterior quando o usuário altera o formulário.
 */
export const createQuote = async (
  request: QuoteRequest,
  signal?: AbortSignal,
): Promise<QuoteResponse> => {
  const payload = await httpRequest<unknown>('/v1/quotes', {
    method: 'POST',
    body: JSON.stringify(request),
    signal,
  })

  const quote = QuoteResponseSchema.safeParse(payload)
  if (!quote.success) throw new Error(INVALID_RESPONSE_MESSAGE)

  return quote.data
}

/** Executa a oferta exibida; o backend recusa se os valores não forem exatamente os dela. */
export const confirmOffer = async (
  offerId: string,
  amounts: ConfirmOfferRequest,
): Promise<TransferExecution> =>
  parseExecution(
    await httpRequest<unknown>(`/v1/quotes/offers/${encodeURIComponent(offerId)}/confirm`, {
      method: 'POST',
      body: JSON.stringify({
        sourceAmount: amounts.sourceAmount,
        targetAmount: amounts.targetAmount,
      }),
    }),
  )

export const getTransferExecution = async (
  executionId: string,
  signal?: AbortSignal,
): Promise<TransferExecution> =>
  parseExecution(
    await httpRequest<unknown>(`/v1/transfer-executions/${encodeURIComponent(executionId)}`, {
      signal,
    }),
  )

/** Aceita a nova cotação de uma execução em REQUOTE_REQUIRED, com os valores exibidos. */
export const confirmRequote = async (
  executionId: string,
  amounts: ConfirmOfferRequest,
): Promise<TransferExecution> =>
  parseExecution(
    await httpRequest<unknown>(
      `/v1/transfer-executions/${encodeURIComponent(executionId)}/requote/confirm`,
      {
        method: 'POST',
        body: JSON.stringify({
          sourceAmount: amounts.sourceAmount,
          targetAmount: amounts.targetAmount,
        }),
      },
    ),
  )
