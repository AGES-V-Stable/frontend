import { z } from 'zod'

import type {
  CreateTransferRequest,
  CreateTransferResponse,
  TransferQuoteResponse,
} from '@/features/transfers/types/transfer'

// Mesmo mínimo do backend (@DecimalMin("0.01")): abaixo disso nem vale consultar a cotação.
export const TransferAmountSchema = z
  .number({ error: 'Informe o valor da transferência' })
  .min(0.01, 'Informe um valor maior que zero')

/** Valida o código TOTP de 6 dígitos numéricos ou código de recuperação de 8 caracteres alfanuméricos. */
export const TotpCodeSchema = z
  .string({ error: 'Informe o código de autenticação' })
  .trim()
  .refine(
    (code) => {
      const isSixDigits = /^\d{6}$/.test(code)
      const cleanRecovery = code.replace(/[^A-Za-z0-9]/g, '')
      const isEightAlphanumeric = cleanRecovery.length === 8
      return isSixDigits || isEightAlphanumeric
    },
    {
      message: 'O código deve conter 6 dígitos numéricos ou código de recuperação de 8 caracteres',
    },
  )

/** Valida o formulário antes do POST /v1/transfers. Descrição vazia não é enviada. */
export const TransferFormSchema = z.object({
  amount: TransferAmountSchema,
  amountType: z.enum(['SOURCE', 'DESTINATION']),
  sourceCurrency: z.string().optional(),
  destinationCurrency: z.string().optional(),
  paymentMethod: z.enum(['TED', 'PIX', 'ACCOUNT_BALANCE', 'BLOCKCHAIN'], {
    error: 'Selecione o método de pagamento',
  }),
  beneficiaryId: z.uuid('Selecione o beneficiário'),
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  totpCode: TotpCodeSchema.optional(),
}) satisfies z.ZodType<CreateTransferRequest>

export const CreateTransferSchema = TransferFormSchema.extend({
  totpCode: TotpCodeSchema,
})

const MoneyAmountSchema = z.object({
  amount: z.number(),
  currency: z.string().min(1),
})

/** Resposta de cotação só é exibida se vier completa; qualquer campo faltando vira erro. */
export const TransferQuoteResponseSchema = z.object({
  source: MoneyAmountSchema,
  destination: MoneyAmountSchema,
  exchangeRate: z.object({
    fromCurrency: z.string().min(1),
    toCurrency: z.string().min(1),
    rate: z.number().positive(),
  }),
  fee: z.object({
    percentage: z.number().nonnegative(),
    amount: z.number().nonnegative(),
    currency: z.string().min(1),
  }),
  total: MoneyAmountSchema,
}) satisfies z.ZodType<TransferQuoteResponse>

export const CreateTransferResponseSchema = z.object({
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
}) satisfies z.ZodType<CreateTransferResponse>
