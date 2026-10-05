import { useCallback, useEffect, useState } from 'react'

import { ClientFilters } from '@/components/ClientFilters'
import type { ClientFilterValues } from '@/components/ClientFilters'
import { Drawer } from '@/components/Drawer'
import { Sidebar } from '@/components/Sidebar'
import { Table } from '@/components/Table'
import { type Cliente } from '@/data/mockClients'
import { useAdminSidebar } from '@/config/adminNavigation'
import { clientTableColumns as columns } from '@/config/clientTableColumns'
import { PATHS } from '@/routes/paths'
import { getClients } from '@/services/clients'

const emptyFilters: ClientFilterValues = { search: '', status: '', city: '', period: '' }
const normalize = (value: string) => value.toLocaleLowerCase('pt-BR')
const getPeriod = (date: string) => date.slice(3)
const ITEMS_PER_PAGE = 4

interface AdminClientsProps {
  /** Fonte dos dados. A rota de demonstração injeta dados fictícios explicitamente. */
  loadClients?: (signal?: AbortSignal) => Promise<Cliente[]>
}

function AdminClients({ loadClients = getClients }: AdminClientsProps) {
  const sidebar = useAdminSidebar()
  const [clients, setClients] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null)
  const [appliedFilters, setAppliedFilters] = useState<ClientFilterValues>(emptyFilters)

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const data = await loadClients(controller.signal)
        if (!controller.signal.aborted) setClients(data)
      } catch {
        if (!controller.signal.aborted)
          setLoadError('Não foi possível carregar os clientes. Tente novamente.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [loadClients, reloadKey])

  const retry = useCallback(() => setReloadKey((key) => key + 1), [])

  const statuses = [...new Set(clients.map((client) => client.status))]
  const cities = [...new Set(clients.map((client) => client.cidade))]
  const periods = [
    ...new Set(clients.map((client) => getPeriod(client.atualizacao)).filter(Boolean)),
  ]

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

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / ITEMS_PER_PAGE))
  const pageStart = (Math.min(currentPage, totalPages) - 1) * ITEMS_PER_PAGE
  const pageClients = filteredClients.slice(pageStart, pageStart + ITEMS_PER_PAGE)

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
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar
        className="sticky top-0"
        logo={
          <span className="sidebar__brand">
            V-<span className="sidebar__brand-accent">Stable</span>
          </span>
        }
        {...sidebar}
      />

      <main className="min-h-screen w-full px-6 py-8 lg:px-10">
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

          {isLoading && (
            <p
              role="status"
              className="rounded-lg border border-sage-300 bg-white px-6 py-5 text-sm text-slate-600"
            >
              Carregando clientes...
            </p>
          )}

          {!isLoading && loadError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700"
            >
              <span>{loadError}</span>
              <button type="button" onClick={retry} className="font-medium underline">
                Tentar novamente
              </button>
            </div>
          )}

          {!isLoading && !loadError && clients.length === 0 && (
            <p
              role="status"
              className="rounded-lg border border-sage-300 bg-white px-6 py-5 text-sm text-slate-600"
            >
              Nenhum cliente cadastrado até o momento.
            </p>
          )}

          {!isLoading && !loadError && clients.length > 0 && filteredClients.length === 0 && (
            <p
              role="status"
              className="rounded-lg border border-sage-300 bg-white px-6 py-5 text-sm text-slate-600"
            >
              Nenhum cliente encontrado para os filtros informados.
            </p>
          )}

          <Table
            title="Todos os clientes"
            entityLabel="clientes"
            totalRecords={filteredClients.length}
            columns={columns}
            data={pageClients}
            actions={[
              {
                label: 'Ver detalhes',
                onClick: (client) => setSelectedClient(client as Cliente),
              },
            ]}
            pagination={{
              currentPage,
              totalPages,
              displayedRecords: pageClients.length,
              itemsPerPage: ITEMS_PER_PAGE,
              totalRecords: filteredClients.length,
              onPageChange: setCurrentPage,
              entityLabel: 'clientes',
            }}
          />
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
      </main>
    </div>
  )
}

export default AdminClients
