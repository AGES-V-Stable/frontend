import type { Beneficiary } from '@/data/mockBeneficiary'
import { normalizeListResponse } from './apiEnvelope'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

const authHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const getBeneficiaries = async (): Promise<Beneficiary[]> => {
  const response = await fetch(`${API_BASE_URL}/beneficiaries`, { headers: authHeaders() })
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
  return normalizeListResponse<Beneficiary>(await response.json())
}

export const getBeneficiary = async (id: string): Promise<Beneficiary> => {
  const response = await fetch(`${API_BASE_URL}/beneficiaries/${encodeURIComponent(id)}`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`)

  const payload: unknown = await response.json()
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    const data = (payload as { data?: unknown }).data
    if (data && typeof data === 'object') return data as Beneficiary
  }

  return payload as Beneficiary
}
