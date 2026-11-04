import { TransactionVolumeSchema } from '@/features/dashboard/schemas/transactionVolume'
import type { DashboardFilters } from '@/features/dashboard/types/dashboardFilters'
import { filtersQuery } from '@/features/dashboard/utils/period'

import { httpRequest } from '@/shared/http/httpClient'

/**
 * Volume transacionado em BRL (soma das transações liquidadas, criadas no período), como string
 * decimal ("412000.00"). Datas ausentes não limitam o período. Para o cliente a empresa vem do
 * token e `companyId` nunca é enviado; para o administrador, sem `companyId` o volume é consolidado.
 */
export async function getTransactionVolume(
  filters: DashboardFilters = {},
  signal?: AbortSignal,
  admin = false,
): Promise<string> {
  const params = filtersQuery(admin ? filters : { ...filters, companyId: undefined }).toString()
  const path = admin ? '/v1/admin/dashboard/transaction-volume' : '/v1/dashboard/transaction-volume'
  const data = TransactionVolumeSchema.parse(
    await httpRequest<unknown>(`${path}${params ? `?${params}` : ''}`, { signal }),
  )
  return data.transactedVolumeBrl
}
