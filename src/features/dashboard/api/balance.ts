import { BalanceSchema } from '@/features/dashboard/schemas/balance'

import { httpRequest } from '@/shared/http/httpClient'

/**
 * Saldo disponível em BRL da empresa do usuário autenticado, como string decimal ("485200.00").
 * A empresa vem do token; o backend não aceita `companyId`.
 */
export async function getBalance(signal?: AbortSignal): Promise<string> {
  const data = BalanceSchema.parse(await httpRequest<unknown>('/v1/balance', { signal }))
  return data.availableBalanceBrl
}
