import { TransactionVolumeSchema } from '@/features/dashboard/schemas/transactionVolume'

import { httpRequest } from '@/shared/http/httpClient'

/**
 * Volume transacionado em BRL da empresa do usuário autenticado (soma das transações liquidadas),
 * como string decimal ("412000.00"). Sem `startDate` ("AAAA-MM-DD") considera todo o histórico.
 * A empresa vem do token; o backend não aceita `companyId`.
 */
export async function getTransactionVolume(
  startDate?: string,
  signal?: AbortSignal,
): Promise<string> {
  const query = startDate ? `?${new URLSearchParams({ startDate }).toString()}` : ''
  const data = TransactionVolumeSchema.parse(
    await httpRequest<unknown>(`/v1/dashboard/transaction-volume${query}`, { signal }),
  )
  return data.transactedVolumeBrl
}
