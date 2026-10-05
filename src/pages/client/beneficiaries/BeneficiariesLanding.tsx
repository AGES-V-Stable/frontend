import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/Button'
import { Table, type ColumnDefinition } from '@/components/Table'
import { ClientLayout } from '../ClientLayout'
import { useClientUser } from '../clientUser'
import { PATHS } from '@/routes/paths'
import { getCompanyBeneficiaries } from '@/services/beneficiary'
import type { Beneficiary } from '@/types/beneficiary'
import { formatDate } from '@/utils/formatters'

const PAGE_SIZE = 10

const RECEIVING_METHOD_LABELS: Record<Beneficiary['receivingMethod'], string> = {
  BANK_ACCOUNT: 'Conta bancária',
  CRYPTO_WALLET: 'Carteira cripto',
  PIX_KEY: 'Chave Pix',
}

const columns: ColumnDefinition<Beneficiary>[] = [
  { key: 'nickname', label: 'Apelido', type: 'text', width: 180 },
  {
    key: 'legalName',
    label: 'Razão social',
    type: 'text',
    width: 220,
    render: (item) => item.legalName ?? item.accountHolderName ?? '—',
  },
  {
    key: 'receivingMethod',
    label: 'Recebimento',
    type: 'text',
    width: 160,
    render: (item) => RECEIVING_METHOD_LABELS[item.receivingMethod] ?? item.receivingMethod,
  },
  {
    key: 'country',
    label: 'País',
    type: 'text',
    width: 140,
    render: (item) => item.country ?? '—',
  },
  {
    key: 'createdAt',
    label: 'Cadastrado em',
    type: 'text',
    width: 150,
    render: (item) => formatDate(item.createdAt),
  },
]

function CompanyBeneficiaries() {
  const { user, loading: userLoading } = useClientUser()
  const companyId = user?.companyId ?? null
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!companyId) return
    const controller = new AbortController()
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const page = await getCompanyBeneficiaries(
          companyId,
          { page: currentPage, size: PAGE_SIZE },
          controller.signal,
        )
        if (controller.signal.aborted) return
        setBeneficiaries(page.content)
        setTotalRecords(page.totalElements)
        setTotalPages(Math.max(page.totalPages, 1))
      } catch {
        if (!controller.signal.aborted) setError('Não foi possível carregar os beneficiários.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [companyId, currentPage])

  if (userLoading) return null

  if (!companyId) {
    return (
      <p role="alert" className="text-sm text-red-700">
        Não foi possível identificar sua empresa.
      </p>
    )
  }

  if (isLoading) {
    return (
      <p role="status" className="text-sm text-[#64748B]">
        Carregando beneficiários...
      </p>
    )
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-red-700">
        {error}
      </p>
    )
  }

  if (beneficiaries.length === 0) {
    return (
      <p role="status" className="rounded-lg bg-white px-6 py-5 text-sm text-[#64748B]">
        Nenhum beneficiário cadastrado ainda.
      </p>
    )
  }

  return (
    <Table
      title="Seus beneficiários"
      entityLabel="beneficiários"
      totalRecords={totalRecords}
      columns={columns}
      data={beneficiaries}
      pagination={{
        currentPage,
        totalPages,
        displayedRecords: beneficiaries.length,
        itemsPerPage: PAGE_SIZE,
        totalRecords,
        onPageChange: setCurrentPage,
        entityLabel: 'beneficiários',
      }}
    />
  )
}

export function BeneficiariesLanding() {
  const navigate = useNavigate()

  return (
    <ClientLayout activeItemId="beneficiaries">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-4 py-8 md:px-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#0F172A]">Beneficiários</h1>
          <p className="text-xs text-[#64748B]">
            Cadastre e gerencie os beneficiários das suas transferências internacionais.
          </p>
        </header>
        <div className="md:w-[220px]">
          <Button
            label="Novo beneficiário"
            onClick={() => navigate(PATHS.BENEFICIARIES_NEW)}
            className="h-12 font-medium"
          />
        </div>
        <CompanyBeneficiaries />
      </div>
    </ClientLayout>
  )
}
