import { z } from 'zod'
import type { DashboardFilters } from '@/features/dashboard/types/dashboardFilters'
import { filtersQuery } from '@/features/dashboard/utils/period'
import { httpRequest, httpResponse } from '@/shared/http/httpClient'

const decimal = z.string().regex(/^-?\d+(\.\d+)?$/)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const summarySchema = z.object({
  currency: z.literal('BRL'),
  startDate: isoDate.nullable(),
  endDate: isoDate.nullable(),
  amount: decimal,
  referenceSpreadPercentage: decimal,
  averageEffectiveSpreadPercentage: decimal.nullable(),
  incomplete: z.boolean(),
  incompleteOperations: z.number().int().nonnegative(),
})
export const seriesSchema = z.object({
  currency: z.literal('BRL'),
  granularity: z.literal('MONTH'),
  startDate: isoDate.nullable(),
  endDate: isoDate.nullable(),
  total: decimal,
  points: z.array(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), amount: decimal })),
  incompleteOperations: z.number().int().nonnegative(),
})
const settlementSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  companyName: z.string().nullable(),
  settledAt: z.string().nullable(),
  createdAt: z.string().nullable(),
  direction: z.enum(['PAYMENT', 'RECEIPT']).nullable(),
  counterparty: z.string().nullable(),
  destination: z.string().nullable(),
  amount: decimal.nullable(),
  currency: z.string(),
  amountBrl: decimal.nullable(),
  exchangeRate: decimal.nullable(),
  feeBrl: decimal.nullable(),
  savings: decimal.nullable(),
  status: z.enum([
    'AWAITING_PAYMENT',
    'PROCESSING',
    'HELD',
    'SETTLED',
    'FAILED',
    'PARTIAL_FAILURE',
    'CANCELED',
    'EXPIRED',
  ]),
})
export const settlementsSchema = z.object({
  content: z.array(settlementSchema),
  number: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
})
export type Settlement = z.infer<typeof settlementSchema>
export const dashboardBase = (admin: boolean) => (admin ? '/v1/admin/dashboard' : '/v1/dashboard')
/** O cliente nunca envia `companyId`: a empresa vem do token. */
export async function getDashboard<T>(
  admin: boolean,
  resource: string,
  filters: DashboardFilters,
  schema: z.ZodType<T>,
  signal: AbortSignal,
  extra: Record<string, string> = {},
): Promise<T> {
  const params = filtersQuery(admin ? filters : { ...filters, companyId: undefined })
  for (const [key, value] of Object.entries(extra)) params.set(key, value)
  const query = params.toString()
  return schema.parse(
    await httpRequest<unknown>(`${dashboardBase(admin)}/${resource}${query ? `?${query}` : ''}`, {
      signal,
    }),
  )
}
export async function downloadStatement(): Promise<void> {
  const response = await httpResponse('/v1/dashboard/statement.pdf', {
    headers: { Accept: 'application/pdf' },
  })
  if (!response.headers.get('Content-Type')?.startsWith('application/pdf'))
    throw new Error('O servidor não retornou um PDF.')
  const blob = await response.blob()
  if (!blob.size) throw new Error('Extrato vazio.')
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = 'extrato-vstable.pdf'
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}
