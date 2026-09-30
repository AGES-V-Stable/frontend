import { type Transfer } from '@/data/mockTransfers'
import { CreateTransferResponseSchema, TransferQuoteResponseSchema } from '@/schemas/transfer'
import type {
  CreateTransferRequest,
  CreateTransferResponse,
  TransferQuoteRequest,
  TransferQuoteResponse,
} from '@/types/transfer'

import { httpRequest } from './httpClient'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

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

const buildQueryParams = (page: number, limit: number, filters?: TransferFilterParams) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })

  if (filters?.search) params.set('search', filters.search)
  if (filters?.beneficiary) params.set('beneficiary', filters.beneficiary)
  if (filters?.startDate) params.set('startDate', filters.startDate)
  if (filters?.endDate) params.set('endDate', filters.endDate)
  if (filters?.minAmount) params.set('minAmount', filters.minAmount)
  if (filters?.maxAmount) params.set('maxAmount', filters.maxAmount)
  if (filters?.status) params.set('status', filters.status)
  if (filters?.type) params.set('type', filters.type)

  return params
}

export const getTransfers = async (
  page: number = 1,
  limit: number = 6,
  filters?: TransferFilterParams,
): Promise<GetTransfersResponse> => {
  const params = buildQueryParams(page, limit, filters)
  const response = await fetch(`${API_BASE_URL}/transfers?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Falha ao buscar transferências da API')
  }

  const payload = await response.json()
  if (payload && Array.isArray(payload.data)) {
    return payload as GetTransfersResponse
  }

  throw new Error('Formato inválido retornado pela API')
}

export const getTransfersById = async (id: string): Promise<Transfer> => {
  const response = await fetch(`${API_BASE_URL}/transfers/${id}`, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error('Falha ao buscar detalhes da transferência')
  }

  const payload = await response.json()
  if (payload && payload.id) {
    return payload as Transfer
  }

  throw new Error('Formato inválido retornado pela API')
}

const INVALID_RESPONSE_MESSAGE = 'Formato inválido retornado pela API'

const toQuoteBody = ({
  amount,
  amountType,
  sourceCurrency,
  destinationCurrency,
}: TransferQuoteRequest): TransferQuoteRequest => ({
  amount,
  amountType,
  sourceCurrency,
  destinationCurrency,
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
    }),
  })

  const result = CreateTransferResponseSchema.safeParse(payload)
  if (!result.success) throw new Error(INVALID_RESPONSE_MESSAGE)

  return result.data
}
