export interface Transfer {
  id: string
  empresa: string
  beneficiario: string
  data: string
  tipo: 'Pagamento' | 'Recebimento'
  valor: string | number | null
  moeda: string
  status: string
  cotacao?: string | number | null
  custos?: string | number | null
  economia?: string | number | null
}
