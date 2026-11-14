import { z } from 'zod'
import { httpRequest } from '@/shared/http/httpClient'

const MoneyAmountSchema = z.object({
  amount: z.number().finite().positive(),
  currency: z.string().min(1),
})

const RequoteSchema = z.object({
  source: MoneyAmountSchema,
  target: MoneyAmountSchema,
  expiresAt: z.string().datetime({ offset: true }),
})

export const TransferExecutionSchema = z.object({
  executionId: z.string().uuid(),
  offerId: z.string().uuid(),
  transactionId: z.string().uuid().nullable(),
  provider: z.string().min(1),
  status: z.enum([
    'PENDING_SUBMISSION',
    'AWAITING_FUNDS',
    'FUNDS_RECEIVED',
    'REQUOTE_REQUIRED',
    'PAYOUT_SUBMITTING',
    'PAYOUT_PROCESSING',
    'SUBMITTED',
    'COMPLETED',
    'FAILED',
    'REFUNDED',
    'RECONCILIATION_REQUIRED',
  ]),
  source: MoneyAmountSchema,
  target: MoneyAmountSchema,
  totalFee: z.number().finite().nonnegative(),
  fundingInstructions: z.string().nullable(),
  requote: RequoteSchema.nullable(),
  failureCode: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
})

export type TransferExecution = z.infer<typeof TransferExecutionSchema>
export type ConfirmedAmounts = { sourceAmount: number; targetAmount: number }

const UUID = z.string().uuid()
const TotpCode = z.string().regex(/^\d{6}$/, 'Informe um código TOTP de 6 dígitos')
const Amounts = z.object({
  sourceAmount: z.number().finite().positive(),
  targetAmount: z.number().finite().positive(),
})

export function requireTotp(totpCode: string): string {
  return TotpCode.parse(totpCode)
}

function confirmationBody(amounts: ConfirmedAmounts, totpCode: string) {
  return JSON.stringify({ ...Amounts.parse(amounts), totpCode: requireTotp(totpCode) })
}

/** Requires a new six-digit TOTP code. Server owns authorization and replay checks. */
export async function confirmOffer(
  offerId: string,
  amounts: ConfirmedAmounts,
  totpCode: string,
): Promise<TransferExecution> {
  const body = confirmationBody(amounts, totpCode)
  const response = await httpRequest<unknown>(
    `/v1/quotes/offers/${encodeURIComponent(UUID.parse(offerId))}/confirm`,
    { method: 'POST', body },
  )
  return TransferExecutionSchema.parse(response)
}

export async function getTransferExecution(executionId: string): Promise<TransferExecution> {
  const response = await httpRequest<unknown>(
    `/v1/transfer-executions/${encodeURIComponent(UUID.parse(executionId))}`,
  )
  return TransferExecutionSchema.parse(response)
}

/** Accepting a worse payout price requires a fresh, explicit authorization. */
export async function confirmRequote(
  executionId: string,
  amounts: ConfirmedAmounts,
  totpCode: string,
): Promise<TransferExecution> {
  const body = confirmationBody(amounts, totpCode)
  const response = await httpRequest<unknown>(
    `/v1/transfer-executions/${encodeURIComponent(UUID.parse(executionId))}/requote/confirm`,
    { method: 'POST', body },
  )
  return TransferExecutionSchema.parse(response)
}
