import { z } from 'zod'

import type { TransferDetails } from '@/types/transferDetails'

const decimal = z.string().regex(/^-?\d+(\.\d+)?$/, 'Valor decimal inválido')

const moneySchema = z.object({
  amount: decimal.nullable(),
  currency: z.string().min(1),
})

const costSchema = z.object({
  amount: decimal,
  currency: z.string().min(1),
  percentage: decimal.nullable(),
})

/** A resposta só é exibida se vier no formato do contrato; qualquer divergência vira erro. */
export const TransferDetailsSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  date: z.iso.datetime({ offset: true }),
  type: z.string().nullable(),
  status: z.string().nullable(),
  counterpartyName: z.string().nullable(),
  counterpartyDetails: z.string().nullable(),
  source: moneySchema,
  destination: moneySchema,
  fundingSource: z.string().nullable(),
  exchangeRate: z
    .object({
      fromCurrency: z.string().min(1),
      toCurrency: z.string().min(1),
      rate: decimal,
    })
    .nullable(),
  costs: z.object({
    serviceFee: costSchema.nullable(),
    spreadPercentage: decimal.nullable(),
    estimatedMarketCost: costSchema.nullable(),
  }),
  estimatedSavings: z.object({ amount: decimal, currency: z.string().min(1) }).nullable(),
  receiptAvailable: z.boolean(),
}) satisfies z.ZodType<TransferDetails>
