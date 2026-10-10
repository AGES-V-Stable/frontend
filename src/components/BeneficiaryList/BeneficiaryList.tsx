import { useEffect, useRef, useState } from 'react'
import { BeneficiaryFilters } from '@/components/BeneficiaryFilters'
import type { BeneficiaryFilterValues } from '@/components/BeneficiaryFilters'
import { Drawer } from '@/components/Drawer'
import { Table } from '@/components/Table'
import { beneficiaryTableColumns } from '@/config/beneficiaryTableColumns'
import type { Beneficiary } from '@/types/beneficiary'
import { getBeneficiaries, getBeneficiary } from '@/services/beneficiary'
import { maskCNPJ } from '@/utils/masks'

const PAGE_SIZE = 10
const emptyFilters: BeneficiaryFilterValues = {
  companyOrCnpj: '',
  search: '',
  country: '',
  currency: '',
  status: '',
}

export interface BeneficiaryListProps {
  title: string
  subtitle: string
  forceCompanyId?: string
}

export function BeneficiaryList({ title, subtitle, forceCompanyId }: BeneficiaryListProps) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters)

  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null)
  const [details, setDetails] = useState<Beneficiary | null>(null)
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const detailsRequestId = useRef(0)

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const isDocument = /^[\d.\-/]+$/.test(appliedFilters.companyOrCnpj)

        const effectiveCompanyId = forceCompanyId
          ? forceCompanyId
          : !isDocument && appliedFilters.companyOrCnpj
            ? appliedFilters.companyOrCnpj
            : undefined

        const data = await getBeneficiaries({
          page: currentPage,
          size: PAGE_SIZE,
          search: appliedFilters.search,
          country: appliedFilters.country,
          document:
            isDocument && !forceCompanyId
              ? appliedFilters.companyOrCnpj.replace(/\D/g, '')
              : undefined,
          companyId: effectiveCompanyId,
        })
        if (active) {
          setBeneficiaries(data.content)
          setTotalRecords(data.totalElements)
          setTotalPages(data.totalPages || 1)
        }
      } catch {
        if (active) setLoadError('Não foi possível carregar os beneficiários.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [currentPage, appliedFilters, forceCompanyId])

  const countries = [
    ...new Set(beneficiaries.map((item) => item.country).filter(Boolean)),
  ] as string[]

  const openDetails = async (beneficiary: Beneficiary) => {
    setSelectedBeneficiary(beneficiary)
    setDetails(null)
    setDetailsError(null)
    setIsDetailsLoading(true)
    const requestId = ++detailsRequestId.current
    try {
      const data = await getBeneficiary(beneficiary.id)
      if (detailsRequestId.current === requestId) setDetails(data)
    } catch {
      if (detailsRequestId.current === requestId)
        setDetailsError('Não foi possível carregar os detalhes do beneficiário.')
    } finally {
      if (detailsRequestId.current === requestId) setIsDetailsLoading(false)
    }
  }

  const closeDetails = () => {
    detailsRequestId.current++
    setSelectedBeneficiary(null)
    setDetails(null)
  }

  const selectedDetails = details ?? selectedBeneficiary

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </header>

      <BeneficiaryFilters
        hideCompanyFilter={!!forceCompanyId}
        countries={countries}
        currencies={['USD', 'EUR', 'BRL']}
        statuses={['Ativo', 'Inativo']}
        onApply={(filters) => {
          setAppliedFilters(filters)
          setCurrentPage(1)
        }}
        onClear={() => {
          setAppliedFilters(emptyFilters)
          setCurrentPage(1)
        }}
      />

      {isLoading && (
        <p role="status" className="rounded-lg bg-white px-6 py-5 text-sm text-slate-600">
          Carregando beneficiários...
        </p>
      )}
      {loadError && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-white px-6 py-5 text-sm text-red-700"
        >
          {loadError}
        </p>
      )}
      {!isLoading && !loadError && beneficiaries.length === 0 && (
        <p role="status" className="rounded-lg bg-white px-6 py-5 text-sm text-slate-600">
          Nenhum beneficiário encontrado.
        </p>
      )}
      {!isLoading && !loadError && beneficiaries.length > 0 && (
        <Table
          title="Todos os beneficiários"
          entityLabel="beneficiários"
          totalRecords={totalRecords}
          columns={beneficiaryTableColumns}
          data={beneficiaries}
          actions={[{ label: 'Ver detalhes', onClick: (item) => openDetails(item as Beneficiary) }]}
          pagination={{
            currentPage,
            totalPages,
            displayedRecords: beneficiaries.length,
            itemsPerPage: PAGE_SIZE,
            totalRecords: totalRecords,
            onPageChange: setCurrentPage,
            entityLabel: 'beneficiários',
          }}
        />
      )}

      <Drawer
        open={Boolean(selectedBeneficiary)}
        title="Detalhes do beneficiário"
        onClose={closeDetails}
      >
        {isDetailsLoading && <p role="status">Carregando detalhes...</p>}
        {detailsError && (
          <p role="alert" className="text-sm text-red-700">
            {detailsError}
          </p>
        )}
        {!isDetailsLoading && !detailsError && selectedDetails && (
          <dl className="space-y-5 text-sm text-slate-900">
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Beneficiário</dt>
              <dd className="mt-1 text-base font-semibold">{selectedDetails.nickname}</dd>
            </div>
            {!forceCompanyId && (
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">
                  ID da Empresa Proprietária
                </dt>
                <dd className="mt-1 font-mono text-xs">{selectedDetails.companyId}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Documento</dt>
              <dd className="mt-1">
                {selectedDetails.identificationDocument
                  ? maskCNPJ(selectedDetails.identificationDocument)
                  : 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">País</dt>
              <dd className="mt-1">{selectedDetails.country || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Endereço</dt>
              <dd className="mt-1">{selectedDetails.address || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">
                Método de Recebimento
              </dt>
              <dd className="mt-1">{selectedDetails.receivingMethod}</dd>
            </div>
            {selectedDetails.receivingMethod === 'BANK_ACCOUNT' && (
              <>
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-500">Titular</dt>
                  <dd className="mt-1">
                    {selectedDetails.accountHolderName || selectedDetails.legalName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-500">Conta / Tipo</dt>
                  <dd className="mt-1">
                    {selectedDetails.accountNumber}{' '}
                    {selectedDetails.accountType ? `(${selectedDetails.accountType})` : ''}
                  </dd>
                </div>
              </>
            )}
            {selectedDetails.receivingMethod === 'PIX_KEY' && (
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Chave Pix</dt>
                <dd className="mt-1">{selectedDetails.pixKey}</dd>
              </div>
            )}
            {selectedDetails.receivingMethod === 'CRYPTO_WALLET' && (
              <>
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-500">Rede</dt>
                  <dd className="mt-1">{selectedDetails.blockchainNetwork}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-500">Endereço</dt>
                  <dd className="mt-1 font-mono text-xs break-all">
                    {selectedDetails.walletAddress}
                  </dd>
                </div>
              </>
            )}
          </dl>
        )}
      </Drawer>
    </div>
  )
}
