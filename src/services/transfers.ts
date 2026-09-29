import { type Transfer } from '@/data/mockTransfers'

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
