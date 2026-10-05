import { type Transfer, type TransferStatusLabel } from '@/data/mockTransfers'

import { apiJson } from './api'

export interface GetTransfersResponse {
  data: Transfer[]
  totalItems: number
  totalPages: number
  /** Página base 1 (como na UI). */
  currentPage: number
}

export interface TransferFilterParams {
  search?: string
  beneficiary?: string
  startDate?: string
  endDate?: string
  minAmount?: string
  maxAmount?: string
  /** Rótulo exibido (ex.: "Concluída"); convertido para o código do backend. */
  status?: string
  /** "Pagamento" ou "Recebimento"; convertido para PAYMENT/RECEIPT. */
  type?: string
}

export type TransactionStatusCode =
  | 'AWAITING_PAYMENT'
  | 'PROCESSING'
  | 'HELD'
  | 'SETTLED'
  | 'FAILED'
  | 'PARTIAL_FAILURE'
  | 'CANCELED'
  | 'EXPIRED'

export const TRANSFER_STATUS_LABELS: Record<TransactionStatusCode, TransferStatusLabel> = {
  AWAITING_PAYMENT: 'Aguardando pagamento',
  PROCESSING: 'Processando',
  HELD: 'Retida',
  SETTLED: 'Concluída',
  FAILED: 'Falha',
  PARTIAL_FAILURE: 'Falha parcial',
  CANCELED: 'Cancelada',
  EXPIRED: 'Expirada',
}

const DIRECTION_LABELS = { PAYMENT: 'Pagamento', RECEIPT: 'Recebimento' } as const
type TransferDirection = keyof typeof DIRECTION_LABELS

/** TransferResponse do backend (valores monetários como string decimal). */
export interface ApiTransfer {
  id: string
  companyId: string
  companyName: string | null
  direction: TransferDirection | null
  beneficiaryId: string | null
  counterpartyName: string | null
  transferMethod: string | null
  status: TransactionStatusCode | null
  foreignCurrency: string
  foreignAmount: string
  settlementAmountBrl: string | null
  serviceFeeBrl: string | null
  exchangeRate: string | null
  createdAt: string
  settledAt: string | null
}

interface SpringPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

const NOT_INFORMED = '—'

const toNumber = (value: string | null | undefined) =>
  value === null || value === undefined || value === '' ? undefined : Number(value)

const codeForLabel = <T extends string>(labels: Record<T, string>, label: string) =>
  (Object.keys(labels) as T[]).find((code) => labels[code] === label)

export function toTransfer(transfer: ApiTransfer): Transfer {
  return {
    id: transfer.id,
    empresa: transfer.companyName ?? NOT_INFORMED,
    beneficiario: transfer.counterpartyName ?? NOT_INFORMED,
    data: transfer.createdAt,
    tipo: transfer.direction === 'RECEIPT' ? 'Recebimento' : 'Pagamento',
    valor: Number(transfer.foreignAmount),
    moeda: transfer.foreignCurrency,
    status: transfer.status ? TRANSFER_STATUS_LABELS[transfer.status] : 'Processando',
    cotacao: toNumber(transfer.exchangeRate),
    custos: toNumber(transfer.serviceFeeBrl),
    // Sem campo persistido equivalente no backend: não é exibido até existir um cálculo confiável.
    economia: undefined,
  }
}

const buildQueryParams = (page: number, limit: number, filters?: TransferFilterParams) => {
  // UI usa página base 1; o Spring usa base 0.
  const params = new URLSearchParams({ page: String(Math.max(page - 1, 0)), size: String(limit) })

  if (filters?.search) params.set('search', filters.search)
  if (filters?.beneficiary) params.set('beneficiary', filters.beneficiary)
  if (filters?.startDate) params.set('startDate', filters.startDate)
  if (filters?.endDate) params.set('endDate', filters.endDate)
  if (filters?.minAmount) params.set('minAmount', filters.minAmount)
  if (filters?.maxAmount) params.set('maxAmount', filters.maxAmount)

  const status = filters?.status ? codeForLabel(TRANSFER_STATUS_LABELS, filters.status) : undefined
  if (status) params.set('status', status)

  const direction = filters?.type ? codeForLabel(DIRECTION_LABELS, filters.type) : undefined
  if (direction) params.set('direction', direction)

  return params
}

export const getTransfers = async (
  page: number = 1,
  limit: number = 6,
  filters?: TransferFilterParams,
): Promise<GetTransfersResponse> => {
  const params = buildQueryParams(page, limit, filters)
  const payload = await apiJson<SpringPage<ApiTransfer>>(`/transfers?${params.toString()}`)

  if (!payload || !Array.isArray(payload.content)) {
    throw new Error('Formato inválido retornado pela API')
  }

  return {
    data: payload.content.map(toTransfer),
    totalItems: payload.totalElements,
    totalPages: Math.max(payload.totalPages, 1),
    currentPage: payload.number + 1,
  }
}

export const getTransfersById = async (id: string): Promise<Transfer> => {
  const payload = await apiJson<ApiTransfer>(`/transfers/${encodeURIComponent(id)}`)

  if (!payload || !payload.id) {
    throw new Error('Formato inválido retornado pela API')
  }

  return toTransfer(payload)
}
