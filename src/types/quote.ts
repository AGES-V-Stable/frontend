export type QuoteDirection = 'PAYOUT' | 'PAYIN'

export type QuoteAmountSide = 'SOURCE' | 'TARGET'

export interface QuoteRequest {
  beneficiaryId: string
  direction: QuoteDirection
  sourceCurrency: string
  targetCurrency: string
  sourcePaymentMethod: string
  targetPaymentMethod: string
  amount: number
  amountSide: QuoteAmountSide
  token?: string
  blockchainNetwork?: string
  coverFees: boolean
  description?: string
}

export interface QuoteOffer {
  offerId: string
  sourceAmount: number
  targetAmount: number
  exchangeRate: number
  totalFee: number
  expiresAt: string | null
}

export interface QuoteResponse {
  quoteRequestId: string
  offer: QuoteOffer
}
