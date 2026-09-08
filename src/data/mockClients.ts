export interface Cliente {
  id: string
  empresa: string
  cnpj: string
  cidade: string
  atualizacao: string
  responsavel: string
  status: string
}

export const mockClients: Cliente[] = [
  {
    id: '1',
    empresa: 'Cooperativa AgroSul',
    cnpj: '45.123.456/0001-90',
    cidade: 'Ribeirão Preto / SP',
    atualizacao: '12/08/2023',
    responsavel: 'Carlos Mendonça',
    status: 'Em auditoria',
  },
  {
    id: '2',
    empresa: 'Metalúrgica Horizonte Ltda.',
    cnpj: '12.345.678/0001-23',
    cidade: 'Belo Horizonte / MG',
    atualizacao: '11/08/2023',
    responsavel: 'Ana Clara Souza',
    status: 'Em auditoria',
  },
  {
    id: '3',
    empresa: 'BioNorte Alimentos S.A.',
    cnpj: '98.765.432/0001-10',
    cidade: 'Belém / PA',
    atualizacao: '10/08/2023',
    responsavel: 'Felipe Batista',
    status: 'Cadastro recebido',
  },
  {
    id: '4',
    empresa: 'TechVale Serviços Ltda.',
    cnpj: '34.567.890/0001-56',
    cidade: 'São José dos Campos / SP',
    atualizacao: '09/08/2023',
    responsavel: 'Mariana Silva',
    status: 'Cadastro recebido',
  },
]
