export interface Beneficiary {
  id: string
  nome: string
  empresa: string
  cnpj: string
  country: string
  currency: string
  status: string
}

export const mockBeneficiary: Beneficiary[] = [
  {
    id: '1',
    nome: 'Maria Oliveira',
    empresa: 'Cooperativa AgroSul',
    cnpj: '45.123.456/0001-90',
    country: 'Brasil',
    currency: 'BRL',
    status: 'Ativo',
  },
  {
    id: '2',
    nome: 'John Smith',
    empresa: 'TechVale Serviços Ltda.',
    cnpj: '34.567.890/0001-56',
    country: 'Estados Unidos',
    currency: 'USD',
    status: 'Pendente',
  },
]
