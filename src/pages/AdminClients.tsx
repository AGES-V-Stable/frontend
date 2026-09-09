import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { ClientFilters } from '@/components/ClientFilters'
import type { ClientFilterValues } from '@/components/ClientFilters'
import { Drawer } from '@/components/Drawer'
import { Sidebar } from '@/components/Sidebar'
import { Table } from '@/components/Table'
import type { Cliente } from '@/data/mockClients'
import { clientTableColumns as columns } from '@/config/clientTableColumns'
import { PATHS } from '@/routes/paths'
import { getClients } from '@/services/clients'

const sidebarMenuItems = [
  { id: 'home', label: 'Início', path: PATHS.HOME },
  { id: 'beneficiaries', label: 'Beneficiários', path: PATHS.ADMIN_CLIENTS },
  { id: 'transfers', label: 'Transferências', path: '/transfers' },
  { id: 'settings', label: 'Configurações', path: '/settings' },
].map((item) => ({
  ...item,
  icon: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="size-full"
      focusable="false"
    >
      {item.id === 'home' && <path d="m3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9" />}
      {item.id === 'beneficiaries' && (
        <>
          <circle cx="9" cy="7" r="3" />
          <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3" />
        </>
      )}
      {item.id === 'transfers' && <path d="M3 7h18m-5-5 5 5-5 5M21 17H3m5-5-5 5 5 5" />}
      {item.id === 'settings' && (
        <>
          <path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  ),
}))

const emptyFilters: ClientFilterValues = { search: '', status: '', city: '', period: '' }
const normalize = (value: string) => value.toLocaleLowerCase('pt-BR')
const getPeriod = (date: string) => date.slice(3)

function AdminClients() {
  const navigate = useNavigate()
  const location = useLocation()
  const [clients, setClients] = useState<Cliente[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null)
  const [appliedFilters, setAppliedFilters] = useState<ClientFilterValues>(emptyFilters)

  const activeItemId = useMemo(() => {
    const matchedItem = sidebarMenuItems.find((item) => item.path === location.pathname)
    return matchedItem?.id ?? 'beneficiaries'
  }, [location.pathname])

  useEffect(() => {
    const loadClients = async () => {
      const data = await getClients()
      setClients(data)
    }

    loadClients()
  }, [])

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
    <div className="flex min-h-screen bg-[#F1F5F9]">
      <Sidebar
        className="sticky top-0"
        logo={
          <span className="sidebar__brand">
            V-<span className="sidebar__brand-accent">Stable</span>
          </span>
        }
        items={sidebarMenuItems.map((item) => ({
          ...item,
          onClick: () => navigate(item.path),
        }))}
        activeItemId={activeItemId}
        account={{ name: 'V-Stable Admin', description: 'Operações & Compliance', initials: 'CA' }}
      />

      <main className="min-h-screen w-full px-6 py-8 lg:px-10">
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
              onClick={() => window.open(PATHS.REGISTER, '_blank', 'noopener,noreferrer')}
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
            actions={[
              {
                label: 'Ver detalhes',
                onClick: (client) => setSelectedClient(client as Cliente),
              },
            ]}
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

        <Drawer
          open={Boolean(selectedClient)}
          title="Detalhes do cliente"
          onClose={closeClientDetails}
        >
          {selectedClient && (
            <div className="space-y-5 text-sm text-[#0F172A]">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
                  Empresa
                </p>
                <p className="mt-1 text-base font-semibold">{selectedClient.empresa}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
                  CNPJ
                </p>
                <p className="mt-1">{selectedClient.cnpj}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
                  Cidade / UF
                </p>
                <p className="mt-1">{selectedClient.cidade}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
                  Responsável
                </p>
                <p className="mt-1">{selectedClient.responsavel}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
                  Status
                </p>
                <p className="mt-1">{selectedClient.status}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
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
