/**
 * Contrato de GET /v1/dashboard/transaction-volume (cicd#53). O valor monetário chega como
 * string decimal, sem formatação local; "0.00" é um volume conhecido igual a zero.
 */
export interface TransactionVolume {
  /** Soma em BRL das transações liquidadas da empresa do usuário autenticado. */
  transactedVolumeBrl: string
}
