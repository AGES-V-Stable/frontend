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

const normalize = (value: string) => value.toLocaleLowerCase('pt-BR')

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

const matchesFilters = (transfer: Transfer, filters?: TransferFilterParams) => {
  if (!filters) return true

  const search = filters.search ? normalize(filters.search.trim()) : ''
  const beneficiary = filters.beneficiary ? normalize(filters.beneficiary.trim()) : ''
  const transferDate = transfer.data.slice(0, 10)

  return (
    (!search || normalize(transfer.empresa).includes(search)) &&
    (!beneficiary || normalize(transfer.beneficiario).includes(beneficiary)) &&
    (!filters.status || transfer.status === filters.status) &&
    (!filters.type || transfer.tipo === filters.type) &&
    (!filters.startDate || transferDate >= filters.startDate) &&
    (!filters.endDate || transferDate <= filters.endDate) &&
    (!filters.minAmount || transfer.valor >= Number(filters.minAmount)) &&
    (!filters.maxAmount || transfer.valor <= Number(filters.maxAmount))
  )
}

export const getTransfers = async (
  page: number = 1,
  limit: number = 6,
  filters?: TransferFilterParams,
): Promise<GetTransfersResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/transfers?page=${page}&limit=${limit}`, {
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
    if (response.ok) {
      const payload = await response.json()
      if (payload && Array.isArray(payload.data)) {
        return payload as GetTransfersResponse
      }
    }

    throw new Error('API failed or returned invalid format, falling back to mock')
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const filteredTransfers = mockTransfers.filter((transfer) => matchesFilters(transfer, filters))

    const totalItems = filteredTransfers.length
    const totalPages = Math.max(1, Math.ceil(totalItems / limit))

    const safePage = Math.max(1, Math.min(page, totalPages))
    const startIndex = (safePage - 1) * limit
    const endIndex = startIndex + limit

    const paginatedData = filteredTransfers.slice(startIndex, endIndex)

    return {
      data: paginatedData,
      totalItems,
      totalPages,
      currentPage: safePage,
    }
  }
}
