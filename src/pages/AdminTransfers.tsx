import { BrandLogo } from '@/components/BrandLogo'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { Drawer } from '@/components/Drawer'
import { AdminNavIcon, Sidebar, type AdminNavIconId } from '@/components/Sidebar'
import { Table } from '@/components/Table'
import { TransferFilters, type TransferFilterValues } from '@/components/TransferFilters'
import { type Transfer } from '@/data/mockTransfers'
import { transferTableColumns as columns } from '@/config/transferTableColumns'
import { PATHS } from '@/routes/paths'
import { getTransfers, getTransfersById, type GetTransfersResponse } from '@/services/transfers'
import { formatCurrency, formatDate } from '@/utils/formatters'

const transferStatuses = ['Concluída', 'Processando', 'Falha']
const transferTypes = ['Pagamento', 'Recebimento']

const emptyFilters: TransferFilterValues = {
  search: '',
  beneficiary: '',
  startDate: '',
  endDate: '',
  minAmount: '',
  maxAmount: '',
  status: '',
  type: '',
}

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

  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null)
  const [drawerData, setDrawerData] = useState<Transfer | null>(null)
  const [isDrawerLoading, setIsDrawerLoading] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [appliedFilters, setAppliedFilters] = useState<TransferFilterValues>(emptyFilters)

  const limit = 12

  const activeItemId = useMemo(() => {
    const matchedItem = sidebarMenuItems.find((item) => item.path === location.pathname)
    return matchedItem?.id ?? 'transfers'
  }, [location.pathname])

  const fetchTransfers = async (page: number, filters: TransferFilterValues) => {
    setIsLoading(true)
    setError(null)
    try {
      const data: GetTransfersResponse = await getTransfers(page, limit, filters)
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
    void fetchTransfers(currentPage, appliedFilters)
  }, [currentPage, appliedFilters])

  const applyFilters = (filters: TransferFilterValues) => {
    setAppliedFilters(filters)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setAppliedFilters(emptyFilters)
    setCurrentPage(1)
  }

  useEffect(() => {
    if (!selectedTransferId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDrawerData(null)
      return
    }

    const fetchDetails = async () => {
      setIsDrawerLoading(true)
      setDrawerError(null)
      try {
        const data = await getTransfersById(selectedTransferId)
        setDrawerData(data)
      } catch {
        setDrawerError('Não foi possível carregar os detalhes da transferência.')
      } finally {
        setIsDrawerLoading(false)
      }
    }

    void fetchDetails()
  }, [selectedTransferId])

  const closeTransferDetails = () => setSelectedTransferId(null)

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar
        className="sticky top-0"
        logo={<BrandLogo className="w-44" />}
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
              <h1 className="text-2xl font-bold text-slate-900">Histórico de Transferências</h1>
              <p className="mt-1 text-xs text-slate-500">
                Acompanhe todas as operações realizadas pelas empresas na plataforma.
              </p>
            </div>
          </header>

          <TransferFilters
            statuses={transferStatuses}
            types={transferTypes}
            onApply={applyFilters}
            onClear={clearFilters}
          />

          {error && (
            <div
              role="alert"
              className="flex flex-col sm:flex-row justify-between items-center gap-4 rounded-lg border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800"
            >
              <p>{error}</p>
              <button
                onClick={() => void fetchTransfers(currentPage, appliedFilters)}
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
                    onClick: (item) => setSelectedTransferId((item as Transfer).id),
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
          open={Boolean(selectedTransferId)}
          title="Detalhes da transferência"
          onClose={closeTransferDetails}
        >
          {isDrawerLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-500">
              Carregando detalhes...
            </div>
          ) : drawerError ? (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{drawerError}</div>
          ) : drawerData ? (
            <div className="space-y-5 text-sm text-slate-900">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                  ID da Transação
                </p>
                <p className="mt-1 text-base font-semibold">{drawerData.id}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                  Empresa
                </p>
                <p className="mt-1">{drawerData.empresa}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                  {drawerData.tipo === 'Recebimento' ? 'Contraparte' : 'Beneficiário'}
                </p>
                <p className="mt-1">{drawerData.beneficiario}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                  Data
                </p>
                <p className="mt-1">{formatDate(drawerData.data)}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                  Tipo
                </p>
                <p className="mt-1">{drawerData.tipo}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                  Valor
                </p>
                <p className="mt-1">{formatCurrency(drawerData.valor, drawerData.moeda)}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                  Status
                </p>
                <p className="mt-1">{drawerData.status}</p>
              </div>

              {drawerData.cotacao !== undefined && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                    Cotação Comercial
                  </p>
                  <p className="mt-1">{formatCurrency(drawerData.cotacao, 'BRL')}</p>
                </div>
              )}

              {drawerData.custos !== undefined && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                    Custos (Taxas)
                  </p>
                  <p className="mt-1">{formatCurrency(drawerData.custos, 'BRL')}</p>
                </div>
              )}

              {drawerData.economia !== undefined && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                    Economia Estimada
                  </p>
                  <p className="mt-1 text-emerald-600 font-medium">
                    {formatCurrency(drawerData.economia, 'BRL')}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </Drawer>
      </main>
    </div>
  )
}

export default AdminTransfers
