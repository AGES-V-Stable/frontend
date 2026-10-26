import { z } from 'zod'
import { httpRequest } from '@/shared/http/httpClient'
import type { Cliente } from '../types/Cliente'

const SummarySchema = z.object({
  id: z.string(),
  legalName: z.string(),
  tradeName: z.string().nullable(),
  cnpj: z.string(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  overallStatus: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']),
  representativeName: z.string().nullable(),
  updatedAt: z.string().nullable(),
  createdAt: z.string(),
})
const statusLabels: Record<string, string> = {
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  UNDER_REVIEW: 'Em análise',
  PENDING: 'Pendente',
  NOT_STARTED: 'Não iniciado',
  EXPIRED: 'Expirado',
}
export async function getClients(signal?: AbortSignal): Promise<Cliente[]> {
  const data = z
    .array(SummarySchema)
    .parse(await httpRequest<unknown>('/v1/companies/summaries', { signal }))
  return data.map((item) => ({
    id: item.id,
    empresa: item.tradeName || item.legalName,
    cnpj: item.cnpj,
    cidade: [item.city, item.state].filter(Boolean).join(' / ') || 'Não disponível',
    atualizacao: new Date(item.updatedAt || item.createdAt).toLocaleDateString('pt-BR'),
    responsavel: item.representativeName || 'Não disponível',
    status: statusLabels[item.overallStatus] ?? item.overallStatus,
  }))
}
