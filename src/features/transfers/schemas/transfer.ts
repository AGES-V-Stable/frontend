import { z } from 'zod'

import type { QuoteResponse, TransferExecution } from '@/features/transfers/types/transfer'

// Mesmo mínimo do backend (@DecimalMin("0.01")): abaixo disso nem vale consultar a cotação.
export const TransferAmountSchema = z
  .number({ error: 'Informe o valor da transferência' })
  .min(0.01, 'Informe um valor maior que zero')

/** Valida o formulário antes de cotar. Descrição vazia não é enviada. */
export const TransferFormSchema = z.object({
  amount: TransferAmountSchema,
  amountType: z.enum(['SOURCE', 'DESTINATION']),
  paymentMethod: z.enum(['PIX', 'TED'], { error: 'Selecione o método de pagamento' }),
  beneficiaryId: z.uuid('Selecione o beneficiário'),
  description: z
    .string()
    .trim()
    .max(128, 'A descrição deve ter no máximo 128 caracteres')
    .optional()
    .transform((value) => value || undefined),
})

const MoneyAmountSchema = z.object({
  amount: z.number().finite(),
  currency: z.string().min(1),
})

/** Oferta só é exibida se vier completa; qualquer campo faltando vira erro. */
export const QuoteResponseSchema = z.object({
  quoteRequestId: z.uuid(),
  offer: z.object({
    offerId: z.uuid(),
    sourceAmount: z.number().positive(),
    targetAmount: z.number().positive(),
    exchangeRate: z.number().positive(),
    totalFee: z.number().nonnegative(),
    expiresAt: z.iso.datetime({ offset: true }).nullable(),
    provider: z.string().min(1),
  }),
}) satisfies z.ZodType<QuoteResponse>

// Campos novos do backend: aceitos ausentes para não quebrar com uma versão anterior da API.
const optionalText = z
  .string()
  .nullish()
  .transform((value) => value ?? null)

const BankTransferSchema = z.object({
  memoCode: optionalText,
  beneficiaryName: optionalText,
  beneficiaryAddress: optionalText,
  bankName: optionalText,
  bankAddress: optionalText,
  routingNumber: optionalText,
  accountNumber: optionalText,
  accountType: optionalText,
})

export const TransferExecutionSchema = z.object({
  executionId: z.uuid(),
  offerId: z.uuid(),
  transactionId: z.uuid().nullable(),
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
  fundingInstructions: z.string().nullable(),
  fundingMethod: z
    .enum(['PIX', 'TED', 'ACCOUNT_BALANCE', 'BLOCKCHAIN'])
    .nullish()
    .transform((value) => value ?? null),
  fundingBankTransfer: BankTransferSchema.nullish().transform((value) => value ?? null),
  requote: z
    .object({
      source: MoneyAmountSchema,
      target: MoneyAmountSchema,
      expiresAt: z.iso.datetime({ offset: true }).nullable(),
    })
    .nullable(),
  failureCode: z.string().nullable(),
}) satisfies z.ZodType<TransferExecution>
