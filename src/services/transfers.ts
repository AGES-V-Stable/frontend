import { type Transfer } from '@/data/mockTransfers'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export interface GetTransfersResponse {
  data: Transfer[]
  totalItems: number
  totalPages: number
  currentPage: number
}

export const getTransfers = async (
  page: number = 1,
  limit: number = 6,
): Promise<GetTransfersResponse> => {
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
}
