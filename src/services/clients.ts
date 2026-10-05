import type { Cliente } from '@/data/mockClients'
import { complianceStatusLabel, type BackendComplianceStatus } from '@/utils/complianceStatus'
import { maskCNPJ } from '@/utils/masks'

import { apiJson } from './api'

/** GET /v1/companies/summaries (somente administradores). */
export interface CompanySummary {
  id: string
  legalName: string
  tradeName: string | null
  cnpj: string
  city: string | null
  state: string | null
  statusKyb: BackendComplianceStatus | null
  statusAml: BackendComplianceStatus | null
  overallStatus: BackendComplianceStatus
  representativeId: string | null
  representativeName: string | null
  representativeEmail: string | null
  createdAt: string | null
  updatedAt: string | null
}

const NOT_INFORMED = '—'

function formatShortDate(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()}`
}

/** Converte o resumo do backend para a linha da tabela de clientes PME. */
export function toCliente(summary: CompanySummary): Cliente {
  return {
    id: summary.id,
    empresa: summary.tradeName || summary.legalName,
    cnpj: maskCNPJ(summary.cnpj),
    cidade: [summary.city, summary.state].filter(Boolean).join(' / ') || NOT_INFORMED,
    atualizacao: formatShortDate(summary.updatedAt ?? summary.createdAt),
    responsavel: summary.representativeName || NOT_INFORMED,
    status: complianceStatusLabel(summary.overallStatus),
  }
}

/**
 * Lista real de empresas cadastradas. Uma lista vazia é um resultado válido —
 * erros são propagados para a tela mostrar o estado de erro (sem dados fictícios).
 */
export const getClients = async (signal?: AbortSignal): Promise<Cliente[]> => {
  const summaries = await apiJson<CompanySummary[]>('/companies/summaries', { signal })
  return summaries.map(toCliente)
}
