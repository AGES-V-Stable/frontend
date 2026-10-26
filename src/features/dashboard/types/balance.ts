/**
 * Contrato de GET /v1/balance (cicd#43). O valor monetário chega como string decimal,
 * sem formatação local; "0.00" é um saldo conhecido igual a zero.
 */
export interface Balance {
  /** Saldo disponível em BRL da empresa do usuário autenticado. */
  availableBalanceBrl: string
}
