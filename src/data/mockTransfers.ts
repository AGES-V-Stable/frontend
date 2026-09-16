export interface Transfer {
  id: string
  empresa: string
  beneficiario: string
  data: string
  tipo: 'Pagamento' | 'Recebimento'
  valor: number
  moeda: 'USD' | 'EUR' | 'BRL'
  status: 'Concluída' | 'Processando' | 'Falha'
}

export const mockTransfers: Transfer[] = [
  {
    id: 't1',
    empresa: 'Tech Corp',
    beneficiario: 'Atlas Imports LLC',
    data: '2026-08-24T12:00:00Z',
    tipo: 'Pagamento',
    valor: 23062.73,
    moeda: 'USD',
    status: 'Concluída',
  },
  {
    id: 't2',
    empresa: 'Agro Export',
    beneficiario: 'Nova Commodities GmbH',
    data: '2026-08-21T09:30:00Z',
    tipo: 'Pagamento',
    valor: 12480.00,
    moeda: 'EUR',
    status: 'Processando',
  },
  {
    id: 't3',
    empresa: 'Tech Corp',
    beneficiario: 'GreenFields Co.',
    data: '2026-08-17T15:45:00Z',
    tipo: 'Recebimento',
    valor: 8940.20,
    moeda: 'USD',
    status: 'Concluída',
  },
  {
    id: 't4',
    empresa: 'Global Logistics',
    beneficiario: 'Ocean Freight Ltd',
    data: '2026-08-15T10:15:00Z',
    tipo: 'Pagamento',
    valor: 5430.50,
    moeda: 'USD',
    status: 'Falha',
  },
  {
    id: 't5',
    empresa: 'Agro Export',
    beneficiario: 'Sunrise Agricultural',
    data: '2026-08-10T08:00:00Z',
    tipo: 'Recebimento',
    valor: 150000.00,
    moeda: 'BRL',
    status: 'Concluída',
  },
  {
    id: 't6',
    empresa: 'Tech Corp',
    beneficiario: 'Silicon Valley Services',
    data: '2026-08-05T14:20:00Z',
    tipo: 'Pagamento',
    valor: 1250.00,
    moeda: 'USD',
    status: 'Concluída',
  },
]

