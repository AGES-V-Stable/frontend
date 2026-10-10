/**
 * Contrato de GET /api/transferencias/{id} (backend#41). Valores monetários, cotação e
 * percentuais chegam como strings decimais, sem formatação local; `null` significa
 * informação indisponível e "0.00" um valor conhecido igual a zero.
 */

export interface TransferMoney {
  /** Nulo quando o valor em BRL ainda não foi registrado. */
  amount: string | null
  currency: string
}

export interface TransferCost {
  amount: string
  currency: string
  /** Em pontos percentuais: "0.45" é 0,45%. */
  percentage: string | null
}

export interface TransferDetailsExchangeRate {
  fromCurrency: string
  toCurrency: string
  /** 1 fromCurrency = rate toCurrency. */
  rate: string
}

export type TransferType = 'PAGAMENTO' | 'RECEBIMENTO'

export interface TransferDetails {
  id: string
  companyId: string
  /** ISO 8601 com fuso. */
  date: string
  /** Esperado: `TransferType`; qualquer outro valor é tratado como indisponível. */
  type: string | null
  status: string | null
  counterpartyName: string | null
  counterpartyDetails: string | null
  source: TransferMoney
  destination: TransferMoney
  fundingSource: string | null
  exchangeRate: TransferDetailsExchangeRate | null
  costs: {
    serviceFee: TransferCost | null
    spreadPercentage: string | null
    estimatedMarketCost: TransferCost | null
  }
  estimatedSavings: { amount: string; currency: string } | null
  receiptAvailable: boolean
}
