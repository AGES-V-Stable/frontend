import { useState } from 'react'

import { ClientFilters } from '@/components/ClientFilters'
import type { ClientFilterValues } from '@/components/ClientFilters'
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

const clients: Cliente[] = [
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

const emptyFilters: ClientFilterValues = { search: '', status: '', city: '', period: '' }
const normalize = (value: string) => value.toLocaleLowerCase('pt-BR')
const getPeriod = (date: string) => date.slice(3)
const noop = () => {}

function AdminClients() {
  const [currentPage, setCurrentPage] = useState(1)
  const [appliedFilters, setAppliedFilters] = useState<ClientFilterValues>(emptyFilters)
  const statuses = [...new Set(clients.map((client) => client.status))]
  const cities = [...new Set(clients.map((client) => client.cidade))]
  const periods = [...new Set(clients.map((client) => getPeriod(client.atualizacao)))]

  const filteredClients = clients.filter((client) => {
    const search = normalize(appliedFilters.search.trim())
    return (
      (!search ||
        normalize(client.empresa).includes(search) ||
        normalize(client.cnpj).includes(search)) &&
      (!appliedFilters.status || client.status === appliedFilters.status) &&
      (!appliedFilters.city || client.cidade === appliedFilters.city) &&
      (!appliedFilters.period || getPeriod(client.atualizacao) === appliedFilters.period)
    )
  })

  const columns: ColumnDefinition<Cliente>[] = [
    { key: 'empresa', label: 'Empresa', type: 'text', width: 300 },
    { key: 'cnpj', label: 'CNPJ', type: 'text', width: 210 },
    { key: 'cidade', label: 'Cidade / UF', type: 'text', width: 210 },
    { key: 'atualizacao', label: 'Última atualização', type: 'text', width: 160 },
    { key: 'status', label: 'Status', type: 'status', width: 140, align: 'center' },
    { key: 'responsavel', label: 'Responsável', type: 'text', width: 160 },
    { key: 'action', label: 'Ação', type: 'action', width: 200, align: 'center' },
  ]

  const applyFilters = (filters: ClientFilterValues) => {
    setAppliedFilters(filters)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setAppliedFilters(emptyFilters)
    setCurrentPage(1)
  }

  return (
    <main className="min-h-screen w-full bg-[#F1F5F9] px-6 py-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Clientes PME</h1>
            <p className="mt-1 text-xs text-[#64748B]">
              Visualize e audite todas as contas cadastradas na plataforma.
            </p>
          </div>
          <button
            type="button"
            className="h-11 rounded-md bg-[#059669] px-5 text-sm font-medium text-white"
          >
            Cadastrar representante
          </button>
        </header>

        <ClientFilters
          statuses={statuses}
          cities={cities}
          periods={periods}
          onApply={applyFilters}
          onClear={clearFilters}
        />

        {filteredClients.length === 0 && (
          <p
            role="status"
            className="rounded-lg border border-[#BBCABF] bg-white px-6 py-5 text-sm text-[#475569]"
          >
            Nenhum cliente encontrado para os filtros informados.
          </p>
        )}

        <Table
          title="Todos os clientes"
          totalRecords={filteredClients.length}
          columns={columns}
          data={filteredClients}
          actions={[{ label: 'Ver detalhes', onClick: noop }]}
          pagination={{
            currentPage,
            totalPages: Math.max(1, Math.ceil(filteredClients.length / 4)),
            displayedRecords: filteredClients.length,
            itemsPerPage: 4,
            totalRecords: filteredClients.length,
            onPageChange: setCurrentPage,
          }}
        />
      </div>
    </main>
  )
}

export default AdminClients
