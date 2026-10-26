/**
 * Contratos de cotação e criação de transferência (POST /v1/transfers/quote e
 * POST /v1/transfers). Espelham os DTOs do backend; identificadores internos da
 * Avenia (quoteId, quoteToken, ticketId) nunca fazem parte destes contratos — o
 * backend gera uma cotação nova ao criar a transferência.
 */

export type TransferAmountType = 'SOURCE' | 'DESTINATION'

export type TransferPaymentMethod = 'TED' | 'PIX' | 'ACCOUNT_BALANCE' | 'BLOCKCHAIN'

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

export interface ExchangeRateInfo {
  fromCurrency: string
  toCurrency: string
  rate: number
}

export interface FeeInfo {
  percentage: number
  amount: number
  currency: string
}

export interface TransferQuoteRequest {
  amount: number
  amountType: TransferAmountType
  sourceCurrency?: string
  destinationCurrency?: string
}

export interface TransferQuoteResponse {
  source: MoneyAmount
  destination: MoneyAmount
  exchangeRate: ExchangeRateInfo
  fee: FeeInfo
  total: MoneyAmount
}

export interface CreateTransferRequest extends TransferQuoteRequest {
  paymentMethod: TransferPaymentMethod
  beneficiaryId: string
  description?: string
}

export interface CreateTransferResponse {
  status: TransactionStatus
}
