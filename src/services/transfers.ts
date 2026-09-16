import { mockTransfers, type Transfer } from '@/data/mockTransfers'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export interface GetTransfersResponse {
  data: Transfer[]
  totalItems: number
  totalPages: number
  currentPage: number
}

export const getTransfers = async (page: number = 1, limit: number = 3): Promise<GetTransfersResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/transfers?page=${page}&limit=${limit}`, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (response.ok) {
      const payload = await response.json()
      if (payload && Array.isArray(payload.data)) {
        return payload as GetTransfersResponse
      }
    }
    
    throw new Error('API failed or returned invalid format, falling back to mock')
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const totalItems = mockTransfers.length
    const totalPages = Math.max(1, Math.ceil(totalItems / limit))
    
    const safePage = Math.max(1, Math.min(page, totalPages))
    const startIndex = (safePage - 1) * limit
    const endIndex = startIndex + limit
    
    const paginatedData = mockTransfers.slice(startIndex, endIndex)

    return {
      data: paginatedData,
      totalItems,
      totalPages,
      currentPage: safePage,
    }
  }
}

