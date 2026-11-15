import { ExchangeRatesSchema } from '@/features/dashboard/schemas/exchangeRates'
import type { ExchangeRate } from '@/features/dashboard/types/exchangeRates'

import { httpRequest } from '@/shared/http/httpClient'

/**
 * Cotações de referência globais, iguais para cliente e administrador. O backend decide se a
 * cotação está atual; o cliente não aplica regra de validade.
 */
export async function getExchangeRates(signal?: AbortSignal): Promise<ExchangeRate[]> {
  const data = ExchangeRatesSchema.parse(
    await httpRequest<unknown>('/v1/exchange-rates', { signal }),
  )
  return data.rates
}
