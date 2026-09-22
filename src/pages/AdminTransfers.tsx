import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { Drawer } from '@/components/Drawer'
import { AdminNavIcon, Sidebar, type AdminNavIconId } from '@/components/Sidebar'
import { Table } from '@/components/Table'
import { type Transfer } from '@/data/mockTransfers'
import { transferTableColumns as columns } from '@/config/transferTableColumns'
import { PATHS } from '@/routes/paths'
import { getTransfers, type GetTransfersResponse } from '@/services/transfers'
import { formatCurrency, formatDate } from '@/utils/formatters'

const sidebarMenuItems = [
  { id: 'home', label: 'Início', path: PATHS.HOME },
  { id: 'beneficiaries', label: 'Beneficiários', path: PATHS.ADMIN_CLIENTS },
  { id: 'transfers', label: 'Transferências', path: PATHS.ADMIN_TRANSFERS },
  { id: 'settings', label: 'Configurações', path: '/settings' },
].map((item) => ({ ...item, icon: <AdminNavIcon id={item.id as AdminNavIconId} /> }))

function AdminTransfers() {
  const navigate = useNavigate()
  const location = useLocation()

  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)

  const limit = 12

  const activeItemId = useMemo(() => {
    const matchedItem = sidebarMenuItems.find((item) => item.path === location.pathname)
    return matchedItem?.id ?? 'transfers'
  }, [location.pathname])

  const fetchTransfers = async (page: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const data: GetTransfersResponse = await getTransfers(page, limit)
      setTransfers(data.data)
      setTotalPages(data.totalPages)
      setTotalItems(data.totalItems)
      setCurrentPage(data.currentPage)
    } catch {
      setError('Não foi possível carregar as transferências. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTransfers(currentPage)
  }, [currentPage])

  const closeTransferDetails = () => setSelectedTransfer(null)

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
              <h1 className="text-2xl font-bold text-[#0F172A]">Histórico de Transferências</h1>
              <p className="mt-1 text-xs text-[#64748B]">
                Acompanhe todas as operações realizadas pelas empresas na plataforma.
              </p>
            </div>
          </header>

          {error && (
            <div
              role="alert"
              className="flex flex-col sm:flex-row justify-between items-center gap-4 rounded-lg border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800"
            >
              <p>{error}</p>
              <button
                onClick={() => fetchTransfers(currentPage)}
                className="rounded-md bg-red-100 px-4 py-2 font-medium text-red-800 hover:bg-red-200 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!error && (
            <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
              <Table
                title="Todas as transferências"
                totalRecords={totalItems > 0 ? totalItems : undefined}
                columns={columns}
                data={transfers}
                emptyMessage={
                  isLoading ? 'Carregando transferências...' : 'Nenhuma transferência encontrada.'
                }
                actions={[
                  {
                    label: 'Ver detalhes',
                    onClick: (item) => setSelectedTransfer(item as Transfer),
                  },
                ]}
                pagination={{
                  currentPage,
                  totalPages,
                  displayedRecords: transfers.length,
                  itemsPerPage: limit,
                  totalRecords: totalItems,
                  onPageChange: setCurrentPage,
                }}
              />
            </div>
          )}
        </div>

        <Drawer
          open={Boolean(selectedTransfer)}
          title="Detalhes da transferência"
          onClose={closeTransferDetails}
        >
          {selectedTransfer && (
            <div className="space-y-5 text-sm text-[#0F172A]">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
                  ID da Transação
                </p>
                <p className="mt-1 text-base font-semibold">{selectedTransfer.id}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
                  Empresa
                </p>
                <p className="mt-1">{selectedTransfer.empresa}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
                  Beneficiário
                </p>
                <p className="mt-1">{selectedTransfer.beneficiario}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
                  Data
                </p>
                <p className="mt-1">{formatDate(selectedTransfer.data)}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
                  Tipo
                </p>
                <p className="mt-1">{selectedTransfer.tipo}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
                  Valor
                </p>
                <p className="mt-1">
                  {formatCurrency(selectedTransfer.valor, selectedTransfer.moeda)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">
                  Status
                </p>
                <p className="mt-1">{selectedTransfer.status}</p>
              </div>
            </div>
          )}
        </Drawer>
      </main>
    </div>
  )
}

export default AdminTransfers
