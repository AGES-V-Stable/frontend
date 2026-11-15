/**
 * Contrato de GET /v1/exchange-rates (AGES-V-Stable/cicd#55). A taxa é o preço de mercado da
 * Avenia, sem tarifas: quanto de `baseCurrency` vale 1 `quoteCurrency`, como string decimal.
 */
interface ExchangeRatePair {
  baseCurrency: string
  quoteCurrency: string
}

/** CURRENT: dentro do prazo de validade. STALE: a atualização falhou; é a última cotação salva. */
export interface AvailableExchangeRate extends ExchangeRatePair {
  status: 'CURRENT' | 'STALE'
  rate: string
  fetchedAt: string
}

/** Nunca houve cotação para o par: não existe número para exibir. */
export interface UnavailableExchangeRate extends ExchangeRatePair {
  status: 'UNAVAILABLE'
  rate: null
  fetchedAt: null
}

export type ExchangeRate = AvailableExchangeRate | UnavailableExchangeRate

export interface ExchangeRates {
  rates: ExchangeRate[]
  ttlSeconds: number
}
