/**
 * Contratos da criação de transferência pelo orquestrador de cotações:
 * POST /v1/quotes escolhe a melhor oferta entre os provedores (Avenia ou BlindPay),
 * POST /v1/quotes/offers/{offerId}/confirm executa exatamente a oferta exibida e
 * GET /v1/transfer-executions/{id} acompanha a execução. Espelham os DTOs do backend.
 */

export type TransferAmountType = 'SOURCE' | 'DESTINATION'

/** Métodos registrados nas transferências (o detalhe exibe também os legados). */
export type TransferPaymentMethod = 'TED' | 'PIX' | 'ACCOUNT_BALANCE' | 'BLOCKCHAIN'

/** Como a empresa paga a transferência criada por esta tela. */
export type FundingMethod = 'PIX' | 'TED'

/** Tokens que a Avenia entrega em carteira com origem BRL via PIX; a rede vem do cadastro. */
export const WALLET_TOKENS = ['USDC', 'USDT', 'BRLA'] as const
export type WalletToken = (typeof WALLET_TOKENS)[number]

export type TransactionStatus =
  | 'AWAITING_PAYMENT'
  | 'PROCESSING'
  | 'HELD'
  | 'SETTLED'
  | 'FAILED'
  | 'PARTIAL_FAILURE'
  | 'CANCELED'
  | 'EXPIRED'

export interface MoneyAmount {
  amount: number
  currency: string
}

/**
 * Token e rede intermediários não são enviados: o backend aplica os configurados para o
 * ambiente. `targetPaymentMethod` é o trilho da conta bancária (ex.: international_swift)
 * ou a rede da carteira cripto (ex.: polygon).
 */
export interface QuoteRequest {
  beneficiaryId: string
  direction: 'PAYOUT'
  sourceCurrency: string
  targetCurrency: string
  sourcePaymentMethod: FundingMethod
  targetPaymentMethod: string
  amount: number
  amountSide: 'SOURCE' | 'TARGET'
  coverFees: boolean
  description?: string
}

/** Melhor oferta. `totalFee` soma tarifas de moedas diferentes e por isso não é exibido. */
export interface QuoteOffer {
  offerId: string
  sourceAmount: number
  targetAmount: number
  exchangeRate: number
  totalFee: number
  expiresAt: string | null
  provider: string
}

export interface QuoteResponse {
  quoteRequestId: string
  offer: QuoteOffer
}

/** Os valores exibidos ao usuário; o backend só executa se forem exatamente os da oferta. */
export interface ConfirmOfferRequest {
  sourceAmount: number
  targetAmount: number
}

export type TransferExecutionStatus =
  | 'PENDING_SUBMISSION'
  | 'AWAITING_FUNDS'
  | 'FUNDS_RECEIVED'
  | 'REQUOTE_REQUIRED'
  | 'PAYOUT_SUBMITTING'
  | 'PAYOUT_PROCESSING'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'RECONCILIATION_REQUIRED'

/** Como a BlindPay devolve no payin (`memo_code` e `blindpay_bank_details`). */
export interface BankTransferInstructions {
  memoCode: string | null
  beneficiaryName: string | null
  beneficiaryAddress: string | null
  bankName: string | null
  bankAddress: string | null
  routingNumber: string | null
  accountNumber: string | null
  accountType: string | null
}

export interface TransferExecution {
  executionId: string
  offerId: string
  transactionId: string | null
  provider: string
  status: TransferExecutionStatus
  source: MoneyAmount
  target: MoneyAmount
  /** Código PIX (copia e cola) a pagar enquanto o status for AWAITING_FUNDS. */
  fundingInstructions: string | null
  /** Método de pagamento da origem; nulo em execuções antigas (sempre PIX). */
  fundingMethod: TransferPaymentMethod | null
  /** Dados da TED enquanto o status for AWAITING_FUNDS; campos ausentes vêm nulos. */
  fundingBankTransfer: BankTransferInstructions | null
  /** Nova cotação a confirmar quando o status for REQUOTE_REQUIRED. */
  requote: { source: MoneyAmount; target: MoneyAmount; expiresAt: string | null } | null
  failureCode: string | null
}
