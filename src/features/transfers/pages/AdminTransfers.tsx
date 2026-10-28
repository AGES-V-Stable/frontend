import { useEffect, useRef, useState } from 'react'

import { Drawer } from '@/shared/components/Drawer'
import { Table } from '@/shared/components/Table'
import {
  TransferFilters,
  type TransferFilterValues,
} from '@/features/transfers/components/TransferFilters'
import { type Transfer } from '@/features/transfers/types/transferHistory'
import { transferTableColumns as columns } from '@/features/transfers/config/transferTableColumns'
import {
  getTransfers,
  getTransfersById,
  type GetTransfersResponse,
} from '@/features/transfers/api/transfers'
import { formatCurrency, formatDate } from '@/shared/utils/formatters'

const transferStatuses = [
  'Aguardando pagamento',
  'Processando',
  'Retida',
  'Concluída',
  'Falha',
  'Falha parcial',
  'Cancelada',
  'Expirada',
]
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

function AdminTransfers() {
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

  const listRequest = useRef(0)
  const limit = 12

  const fetchTransfers = async (
    page: number,
    filters: TransferFilterValues,
    signal?: AbortSignal,
  ) => {
    const requestId = ++listRequest.current
    setIsLoading(true)
    setError(null)
    try {
      const data: GetTransfersResponse = await getTransfers(page, limit, filters, signal)
      if (signal?.aborted || listRequest.current !== requestId) return
      setTransfers(data.data)
      setTotalPages(data.totalPages)
      setTotalItems(data.totalItems)
      setCurrentPage(data.currentPage)
    } catch {
      if (!signal?.aborted && listRequest.current === requestId)
        setError('Não foi possível carregar as transferências. Tente novamente.')
    } finally {
      if (!signal?.aborted && listRequest.current === requestId) setIsLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTransfers(currentPage, appliedFilters, controller.signal)
    return () => controller.abort()
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

    const controller = new AbortController()
    const fetchDetails = async () => {
      setIsDrawerLoading(true)
      setDrawerError(null)
      try {
        const data = await getTransfersById(selectedTransferId, controller.signal)
        if (controller.signal.aborted) return
        setDrawerData(data)
      } catch {
        if (!controller.signal.aborted)
          setDrawerError('Não foi possível carregar os detalhes da transferência.')
      } finally {
        if (!controller.signal.aborted) setIsDrawerLoading(false)
      }
    }

    void fetchDetails()
    return () => controller.abort()
  }, [selectedTransferId])

  const closeTransferDetails = () => setSelectedTransferId(null)

  return (
    <>
      <section className="min-h-screen w-full px-6 py-8 lg:px-10">
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
                entityLabel="transferências"
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

              {drawerData.cotacao != null && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                    Cotação Comercial
                  </p>
                  <p className="mt-1">{formatCurrency(drawerData.cotacao, 'BRL')}</p>
                </div>
              )}

              {drawerData.custos != null && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                    Custos (Taxas)
                  </p>
                  <p className="mt-1">{formatCurrency(drawerData.custos, 'BRL')}</p>
                </div>
              )}

              {drawerData.economia != null && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                    Economia Estimada
                  </p>
                  <p className="mt-1 text-emerald-700 font-medium">
                    {formatCurrency(drawerData.economia, 'BRL')}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </Drawer>
      </section>
    </>
  )
}

export default AdminTransfers
