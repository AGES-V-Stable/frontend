import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { hasCompanyPermission, useSession } from '@/features/auth'
import { getCompanyBeneficiaries } from '@/features/beneficiaries'
import { Button } from '@/shared/components/Button'
import { Table } from '@/shared/components/Table'
import {
  TransferFilters,
  type TransferFilterValues,
} from '@/features/transfers/components/TransferFilters'
import { type Transfer } from '@/features/transfers/types/transferHistory'
import { transferTableColumns } from '@/features/transfers/config/transferTableColumns'
import { getClientTransfers } from '@/features/transfers/api/transfers'
import { PATHS, transferDetailsPath } from '@/shared/navigation/paths'

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

const clientColumns = transferTableColumns.filter((column) => column.key !== 'empresa')

export function TransfersLanding() {
  const navigate = useNavigate()
  const { user } = useSession()
  const companyId = user?.companyId
  const canCreate = hasCompanyPermission(user, 'TRANSFER_CREATE')

  const [beneficiaryOptions, setBeneficiaryOptions] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [appliedFilters, setAppliedFilters] = useState<TransferFilterValues>(emptyFilters)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    key: string
    transfers: Transfer[]
    totalPages: number
    totalItems: number
    error: string | null
  }>({
    key: '',
    transfers: [],
    totalPages: 1,
    totalItems: 0,
    error: null,
  })

  const limit = 12
  const requestKey = `${currentPage}|${JSON.stringify(appliedFilters)}|${attempt}`

  useEffect(() => {
    if (!companyId) return
    const controller = new AbortController()
    void getCompanyBeneficiaries(companyId, { size: 100 }, controller.signal)
      .then((page) => {
        if (controller.signal.aborted || !Array.isArray(page.content)) return
        const names = Array.from(
          new Set(
            page.content
              .map((item) => item.nickname || item.accountHolderName || item.legalName || '')
              .filter(Boolean),
          ),
        )
        setBeneficiaryOptions(names)
      })
      .catch(() => {
        // Falha silenciosa: o usuário ainda pode digitar o nome manualmente no campo.
      })
    return () => controller.abort()
  }, [companyId])

  useEffect(() => {
    const controller = new AbortController()
    void getClientTransfers(currentPage, limit, appliedFilters, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setResult({
            key: requestKey,
            transfers: data.data,
            totalPages: data.totalPages,
            totalItems: data.totalItems,
            error: null,
          })
        }
      },
      () => {
        if (!controller.signal.aborted) {
          setResult((prev) => ({
            ...prev,
            key: requestKey,
            error: 'Não foi possível carregar as transferências. Tente novamente.',
          }))
        }
      },
    )
    return () => controller.abort()
  }, [currentPage, appliedFilters, requestKey])

  const isLoading = result.key !== requestKey
  const transfers = result.transfers
  const totalPages = result.totalPages
  const totalItems = result.totalItems
  const error = isLoading ? null : result.error

  const applyFilters = (filters: TransferFilterValues) => {
    setAppliedFilters(filters)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setAppliedFilters(emptyFilters)
    setCurrentPage(1)
  }

  return (
    <section className="w-full px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-slate-900">Histórico de Transferências</h1>
            <p className="text-xs text-slate-600">
              {canCreate
                ? 'Acompanhe todas as operações realizadas pela sua empresa.'
                : 'Consulte o histórico de transferências internacionais da empresa.'}
            </p>
          </div>
          {canCreate && (
            <div className="md:w-[230px]">
              <Button
                label="Realizar transferência"
                onClick={() => navigate(PATHS.TRANSFERS_NEW)}
                className="h-12 font-medium"
              />
            </div>
          )}
        </header>

        {error && (
          <div
            role="alert"
            className="flex flex-col items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-800 sm:flex-row"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="rounded-md bg-red-100 px-4 py-2 font-medium text-red-800 transition-colors hover:bg-red-200"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!error && (
          <div
            className={`rounded-lg bg-white ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <div className="px-6 pt-5">
              <TransferFilters
                collapsible
                beneficiaries={beneficiaryOptions}
                statuses={transferStatuses}
                types={transferTypes}
                onApply={applyFilters}
                onClear={clearFilters}
              />
              {!isLoading && totalItems > 0 && (
                <p className="pt-3 text-xs font-medium text-slate-500 tabular-nums">
                  {totalItems} {totalItems === 1 ? 'transferência' : 'transferências'}
                </p>
              )}
            </div>
            <Table
              sortable
              entityLabel="transferências"
              rowLabel={(transfer) => transfer.beneficiario}
              columns={clientColumns}
              data={transfers}
              emptyMessage={
                isLoading ? 'Carregando transferências...' : 'Nenhuma transferência encontrada.'
              }
              actions={[
                {
                  label: 'Ver detalhes',
                  onClick: (item) =>
                    navigate(transferDetailsPath((item as Transfer).id), {
                      state: { fromTransferList: true },
                    }),
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
    </section>
  )
}
