import { z } from 'zod'
import { httpRequest, httpResponse } from '@/shared/http/httpClient'

const decimal = z.string().regex(/^-?\d+(\.\d+)?$/)
export const summarySchema = z.object({
  year: z.number().int(),
  currency: z.literal('BRL'),
  amount: decimal.nullable(),
  knownSubtotal: decimal,
  incomplete: z.boolean(),
  undatedOperations: z.number(),
})
export const seriesSchema = z.object({
  currency: z.literal('BRL'),
  period: z.string(),
  points: z.array(
    z.object({ month: z.string(), amount: decimal.nullable(), incomplete: z.boolean() }),
  ),
  undatedOperations: z.number(),
})
const settlementSchema = z.object({
  id: z.string().nullable(),
  date: z.string().nullable(),
  direction: z.enum(['PAYMENT', 'RECEIPT']),
  counterparty: z.string().nullable(),
  destination: z.string().nullable(),
  amount: decimal.nullable(),
  currency: z.string(),
  totalBrl: decimal.nullable(),
  feeBrl: decimal.nullable(),
  rate: decimal.nullable(),
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
  number: z.number().int(),
  size: z.literal(5),
  totalElements: z.number().int().min(0).max(20),
  totalPages: z.number().int().min(0).max(4),
})
export type Settlement = z.infer<typeof settlementSchema>
export type Period = 'ALL' | 'SIX_MONTHS' | 'THIS_MONTH'
export const dashboardBase = (admin: boolean) => (admin ? '/v1/admin/dashboard' : '/v1/dashboard')
export async function getDashboard<T>(
  admin: boolean,
  suffix: string,
  schema: z.ZodType<T>,
  signal: AbortSignal,
): Promise<T> {
  return schema.parse(await httpRequest<unknown>(`${dashboardBase(admin)}/${suffix}`, { signal }))
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
