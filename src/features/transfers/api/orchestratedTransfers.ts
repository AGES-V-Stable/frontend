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

/**
 * The comparison endpoint returns only the selected winning offer. It never creates
 * a transfer; the user must authorize that specific offer separately with a TOTP.
 */
export const OrchestratedQuoteRequestSchema = z.object({
  beneficiaryId: UUID,
  direction: z.literal('PAYOUT'),
  sourceCurrency: z.literal('BRL'),
  targetCurrency: z.string().regex(/^[A-Z]{3,10}$/),
  sourcePaymentMethod: z.enum(['pix', 'ted']),
  targetPaymentMethod: z.string().min(1).max(50),
  amount: z.number().finite().min(0.01),
  amountSide: z.enum(['SOURCE', 'TARGET']),
  token: z.string().min(1).max(20).optional(),
  blockchainNetwork: z.string().min(1).max(50).optional(),
  coverFees: z.boolean(),
  description: z.string().max(128).optional(),
})

export const OrchestratedQuoteResponseSchema = z.object({
  quoteRequestId: UUID,
  offer: z.object({
    offerId: UUID,
    provider: z.enum(['BLINDPAY', 'AVENIA']),
    sourceAmount: z.number().finite().positive(),
    targetAmount: z.number().finite().positive(),
    exchangeRate: z.number().finite().positive(),
    totalFee: z.number().finite().nonnegative(),
    expiresAt: z.string().datetime({ offset: true }),
  }),
})

export type OrchestratedQuoteRequest = z.infer<typeof OrchestratedQuoteRequestSchema>
export type OrchestratedQuoteResponse = z.infer<typeof OrchestratedQuoteResponseSchema>

export async function requestOrchestratedQuote(
  request: OrchestratedQuoteRequest,
  signal?: AbortSignal,
): Promise<OrchestratedQuoteResponse> {
  const body = JSON.stringify(OrchestratedQuoteRequestSchema.parse(request))
  const response = await httpRequest<unknown>('/v1/quotes', {
    method: 'POST',
    body,
    signal,
  })
  return OrchestratedQuoteResponseSchema.parse(response)
}
