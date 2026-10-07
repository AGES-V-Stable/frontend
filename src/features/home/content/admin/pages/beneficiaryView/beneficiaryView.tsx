import { useEffect, useRef, useState } from 'react'

import { Home } from '@/features/home/Home'
import { BeneficiaryFilters } from '@/features/home/content/admin/components/BeneficiaryFilters'
import type { BeneficiaryFilterValues } from '@/features/home/content/admin/components/BeneficiaryFilters'
import { Drawer } from '@/shared/components/Drawer'
import { Table } from '@/shared/components/Table'
import { beneficiaryTableColumns } from '@/features/home/content/admin/components/tables/beneficiaryTableColumns'
import type { Beneficiary } from '@/shared/types/beneficiary'
import { getBeneficiaries, getBeneficiary } from '@/shared/services/beneficiary'
import { maskCNPJ } from '@/shared/utils/masks'

const PAGE_SIZE = 10
const emptyFilters: BeneficiaryFilterValues = {
  companyOrCnpj: '', // companyId ou document no backend
  search: '', // nickname no backend
  country: '',
  currency: '', // O backend atual ainda não tem filtro por moeda.
  status: '', // O schema de beneficiaries ainda não mapeou "status", não enviamos.
}

function BeneficiaryView() {
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
        const data = await getBeneficiaries({
          page: currentPage,
          size: PAGE_SIZE,
          search: appliedFilters.search,
          country: appliedFilters.country,
          document: isDocument ? appliedFilters.companyOrCnpj.replace(/\D/g, '') : undefined,
          // Se não for documento numérico puro (ex: UUID), pode passar como companyId
          companyId:
            !isDocument && appliedFilters.companyOrCnpj ? appliedFilters.companyOrCnpj : undefined,
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
  }, [currentPage, appliedFilters])

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
    <Home>
      <main className="min-h-screen w-full px-6 py-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
          <header>
            <h1 className="text-2xl font-bold text-slate-900">Beneficiários</h1>
            <p className="mt-1 text-xs text-slate-500">
              Consulta global de beneficiários cadastrados na plataforma.
            </p>
          </header>
          <BeneficiaryFilters
            countries={countries}
            currencies={['USD', 'EUR', 'BRL']} // Mock
            statuses={['Ativo', 'Inativo']} // Mock
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
              actions={[
                { label: 'Ver detalhes', onClick: (item) => openDetails(item as Beneficiary) },
              ]}
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
        </div>
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
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">
                  ID da Empresa Proprietária
                </dt>
                <dd className="mt-1 font-mono text-xs">{selectedDetails.companyId}</dd>
              </div>
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
                <dt className="text-xs font-medium uppercase text-slate-500">
                  Método de Recebimento
                </dt>
                <dd className="mt-1">{selectedDetails.receivingMethod}</dd>
              </div>
              {selectedDetails.receivingMethod === 'BANK_ACCOUNT' && (
                <>
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Titular</dt>
                    <dd className="mt-1">{selectedDetails.accountHolderName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Conta / Tipo</dt>
                    <dd className="mt-1">
                      {selectedDetails.accountNumber} ({selectedDetails.accountType})
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
      </main>
    </Home>
  )
}

export default BeneficiaryView
