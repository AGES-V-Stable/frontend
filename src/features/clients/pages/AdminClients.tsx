import { useEffect, useState } from 'react'

import { ClientFilters } from '@/features/clients/components/ClientFilters'
import type { ClientFilterValues } from '@/features/clients/components/ClientFilters'
import { Drawer } from '@/shared/components/Drawer'
import { Table } from '@/shared/components/Table'
import { type Cliente } from '@/features/clients/types/Cliente'
import { clientTableColumns as columns } from '@/features/clients/config/clientTableColumns'
import { PATHS } from '@/shared/navigation/paths'
import { getClients } from '@/features/clients/api/clients'

const emptyFilters: ClientFilterValues = { search: '', status: '', city: '', period: '' }
const normalize = (value: string) => value.toLocaleLowerCase('pt-BR')
const getPeriod = (date: string) => date.slice(3)

function AdminClients() {
  const [clients, setClients] = useState<Cliente[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null)
  const [appliedFilters, setAppliedFilters] = useState<ClientFilterValues>(emptyFilters)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getClients(controller.signal)
        if (!controller.signal.aborted) setClients(data)
      } catch {
        if (!controller.signal.aborted) setError('Não foi possível carregar os clientes.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [revision])

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

  const applyFilters = (filters: ClientFilterValues) => {
    setAppliedFilters(filters)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setAppliedFilters(emptyFilters)
    setCurrentPage(1)
  }

  const closeClientDetails = () => setSelectedClient(null)

  return (
    <>
      <section className="min-h-screen w-full px-6 py-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
          <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Clientes PME</h1>
              <p className="mt-1 text-xs text-slate-500">
                Visualize e audite todas as contas cadastradas na plataforma.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.open(PATHS.REGISTER, '_blank', 'noopener,noreferrer')}
              className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-white"
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

          {loading && <p role="status">Carregando clientes...</p>}
          {error && (
            <div>
              <p role="alert">{error}</p>
              <button type="button" onClick={() => setRevision((value) => value + 1)}>
                Tentar novamente
              </button>
            </div>
          )}
          {!loading && !error && filteredClients.length === 0 && (
            <p
              role="status"
              className="rounded-lg border border-sage-300 bg-white px-6 py-5 text-sm text-slate-600"
            >
              Nenhum cliente encontrado para os filtros informados.
            </p>
          )}

          {!loading && !error && (
            <Table
              title="Todos os clientes"
              entityLabel="clientes"
              totalRecords={filteredClients.length}
              columns={columns}
              data={filteredClients.slice((currentPage - 1) * 4, currentPage * 4)}
              actions={[
                {
                  label: 'Ver detalhes',
                  onClick: (client) => setSelectedClient(client as Cliente),
                },
              ]}
              pagination={{
                currentPage,
                totalPages: Math.max(1, Math.ceil(filteredClients.length / 4)),
                displayedRecords: Math.min(
                  4,
                  Math.max(0, filteredClients.length - (currentPage - 1) * 4),
                ),
                itemsPerPage: 4,
                totalRecords: filteredClients.length,
                onPageChange: setCurrentPage,
                entityLabel: 'clientes',
              }}
            />
          )}
        </div>

        <Drawer
          open={Boolean(selectedClient)}
          title="Detalhes do cliente"
          onClose={closeClientDetails}
        >
          {selectedClient && (
            <div className="space-y-5 text-sm text-slate-900">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                  Empresa
                </p>
                <p className="mt-1 text-base font-semibold">{selectedClient.empresa}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                  CNPJ
                </p>
                <p className="mt-1">{selectedClient.cnpj}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                  Cidade / UF
                </p>
                <p className="mt-1">{selectedClient.cidade}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                  Responsável
                </p>
                <p className="mt-1">{selectedClient.responsavel}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                  Status
                </p>
                <p className="mt-1">{selectedClient.status}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                  Última atualização
                </p>
                <p className="mt-1">{selectedClient.atualizacao}</p>
              </div>
            </div>
          )}
        </Drawer>
      </section>
    </>
  )
}

export default AdminClients
