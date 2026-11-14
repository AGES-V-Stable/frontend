import { z } from 'zod'

import type { ExchangeRates } from '@/features/dashboard/types/exchangeRates'

const currency = z.string().regex(/^[A-Z][A-Za-z]{2,9}$/, 'Moeda inválida')

/**
 * Uma cotação só é exibida com número e data quando o backend a declara disponível; uma
 * resposta indisponível com taxa, ou disponível sem taxa, é rejeitada em vez de exibida.
 */
const exchangeRateSchema = z.discriminatedUnion('status', [
  z.object({
    baseCurrency: currency,
    quoteCurrency: currency,
    status: z.enum(['CURRENT', 'STALE']),
    rate: z.string().regex(/^\d+(\.\d+)?$/, 'Taxa decimal inválida'),
    fetchedAt: z.string().datetime({ offset: true }),
  }),
  z.object({
    baseCurrency: currency,
    quoteCurrency: currency,
    status: z.literal('UNAVAILABLE'),
    rate: z.null(),
    fetchedAt: z.null(),
  }),
])

export const ExchangeRatesSchema = z.object({
  rates: z.array(exchangeRateSchema),
  ttlSeconds: z.number().int().nonnegative(),
}) satisfies z.ZodType<ExchangeRates>
