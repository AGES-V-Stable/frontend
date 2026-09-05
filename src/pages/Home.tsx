import { Button } from '@/components/Button'
import { Table } from '@/components/Table'
import type { ColumnDefinition } from '@/components/Table'

interface Cliente {
  id: string
  empresa: string
  cnpj: string
  cidade: string
  atualizacao: string
  responsavel: string
  status: string
}

const mockData: Cliente[] = [
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

const noop = () => {};

function Home() {
  const columns: ColumnDefinition<Cliente>[] = [
    { key: 'empresa', label: 'Empresa', type: 'text', width: 300 },
    { key: 'cnpj', label: 'CNPJ', type: 'text', width: 210 },
    { key: 'cidade', label: 'Cidade / UF', type: 'text', width: 210 },
    { key: 'atualizacao', label: 'Última atualização', type: 'text', width: 160 },
    { key: 'responsavel', label: 'Responsável', type: 'text', width: 160 },
    { key: 'status', label: 'Status', type: 'status', width: 140, align: 'center' },
    { key: 'action', label: 'Ação', type: 'action', width: 200, align: 'center' },
  ]

  return (
    <div className="p-8 flex flex-col gap-8 w-full bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold mb-4">V-Stable</h1>

        {/* Table Example */}
        <div className="w-full">
          <Table
            title="Todos os clientes"
            totalRecords={24}
            columns={columns}
            data={mockData}
            actions={[{ label: 'Ver detalhes', onClick: noop }]}
          />
        </div>
      </div>

      <div className="flex flex-col gap-8 max-w-md mt-12 border-t pt-8">
        <h1 className="text-2xl font-bold mb-4">Button Components</h1>
        <div className="w-full flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-600">Primary Button</h2>
          <Button
            label="Continuar"
            variant="primary"
            onClick={noop}
          />
        </div>

        <div className="w-full flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-600">Secondary Button</h2>
          <Button
            label="Voltar"
            variant="secondary"
            onClick={noop}
          />
        </div>

        <div className="w-full flex flex-col gap-2 items-center">
          <h2 className="text-sm font-semibold text-gray-600 self-start">Tertiary Button</h2>
          <Button
            label="Esqueci minha senha"
            variant="tertiary"
            onClick={noop}
          />
        </div>

        <div className="w-full flex flex-col gap-4 mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-600">Disabled States</h2>
          <Button label="Primário Desabilitado" variant="primary" disabled />
          <Button label="Secundário Desabilitado" variant="secondary" disabled />
          <Button label="Terciário Desabilitado" variant="tertiary" disabled />
        </div>
      </div>
    </div>
  )
}

export default Home
