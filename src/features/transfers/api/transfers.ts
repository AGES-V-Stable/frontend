import { z } from 'zod'
import type { Transfer } from '../types/transferHistory'
import { CreateTransferResponseSchema, TransferQuoteResponseSchema } from '../schemas/transfer'
import type {
  CreateTransferRequest,
  CreateTransferResponse,
  TransferQuoteRequest,
  TransferQuoteResponse,
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

const decimalOrNumber = z
  .union([decimal, z.number()])
  .transform((value) => String(value))
  .nullable()

const ClientTransferSchema = z.object({
  id: z.string(),
  companyId: z.string().nullable().optional(),
  date: z.string(),
  type: z.string().nullable(),
  amountBrl: decimalOrNumber.optional(),
  amountForeign: decimalOrNumber.optional(),
  foreignCurrency: z.string().nullable().optional(),
  status: z.string(),
  counterparty: z.string().nullable().optional(),
})

function toClientTransfer(item: z.infer<typeof ClientTransferSchema>): Transfer {
  return {
    id: item.id,
    empresa: '',
    beneficiario: item.counterparty ?? 'Não disponível',
    data: item.date,
    tipo: item.type === 'EXPORT' ? 'Recebimento' : 'Pagamento',
    valor: item.amountForeign ?? item.amountBrl ?? null,
    moeda: item.foreignCurrency ?? 'BRL',
    status: transferStatusLabels[item.status] ?? item.status,
    cotacao: null,
    custos: null,
  }
}

/** Lista o histórico de transferências da empresa autenticada via `/api/transferencias`. */
export async function getClientTransfers(
  page = 1,
  limit = 12,
  filters?: TransferFilterParams,
  signal?: AbortSignal,
): Promise<GetTransfersResponse> {
  const params = new URLSearchParams({
    page: String(Math.max(0, page - 1)),
    size: String(limit),
    sort: 'createdAt,desc',
  })
  if (filters?.startDate) params.set('startDate', `${filters.startDate}T00:00:00Z`)
  if (filters?.endDate) params.set('endDate', `${filters.endDate}T23:59:59Z`)
  if (filters?.minAmount) params.set('minAmount', filters.minAmount)
  if (filters?.maxAmount) params.set('maxAmount', filters.maxAmount)
  if (filters?.status) {
    params.set(
      'status',
      Object.entries(transferStatusLabels).find(([, label]) => label === filters.status)?.[0] ??
        filters.status,
    )
  }
  if (filters?.type) {
    params.set('type', filters.type === 'Pagamento' ? 'IMPORT' : 'EXPORT')
  }

  const parsed = z
    .object({
      content: z.array(ClientTransferSchema),
      totalElements: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
      number: z.number().int().nonnegative(),
    })
    .parse(await httpRequest<unknown>(`/api/transferencias?${params}`, { signal }))

  return {
    data: parsed.content.map(toClientTransfer),
    totalItems: parsed.totalElements,
    totalPages: Math.max(1, parsed.totalPages),
    currentPage: parsed.number + 1,
  }
}

const INVALID_RESPONSE_MESSAGE = 'Formato inválido retornado pela API'

const toQuoteBody = ({
  amount,
  amountType,
  sourceCurrency,
  destinationCurrency,
  beneficiaryId,
  paymentMethod,
}: TransferQuoteRequest): TransferQuoteRequest => ({
  amount,
  amountType,
  sourceCurrency,
  destinationCurrency,
  beneficiaryId,
  paymentMethod,
})

/**
 * Consulta uma cotação só para exibição; não cria transferência. O `signal`
 * permite cancelar a consulta anterior quando o usuário altera o valor.
 */
export const getTransferQuote = async (
  request: TransferQuoteRequest,
  signal?: AbortSignal,
): Promise<TransferQuoteResponse> => {
  const payload = await httpRequest<unknown>('/v1/transfers/quote', {
    method: 'POST',
    body: JSON.stringify(toQuoteBody(request)),
    signal,
  })

  const quote = TransferQuoteResponseSchema.safeParse(payload)
  if (!quote.success) throw new Error(INVALID_RESPONSE_MESSAGE)

  return quote.data
}

/**
 * Cria a transferência. Nenhum dado da cotação exibida é enviado: o backend
 * gera uma cotação nova e a usa imediatamente.
 */
export const createTransfer = async (
  request: CreateTransferRequest,
): Promise<CreateTransferResponse> => {
  const payload = await httpRequest<unknown>('/v1/transfers', {
    method: 'POST',
    body: JSON.stringify({
      ...toQuoteBody(request),
      paymentMethod: request.paymentMethod,
      beneficiaryId: request.beneficiaryId,
      description: request.description,
      ...(request.totpCode !== undefined ? { totpCode: request.totpCode } : {}),
    }),
  })

  const result = CreateTransferResponseSchema.safeParse(payload)
  if (!result.success) throw new Error(INVALID_RESPONSE_MESSAGE)

  return result.data
}
