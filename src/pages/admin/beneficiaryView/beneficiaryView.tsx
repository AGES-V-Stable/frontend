import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { BeneficiaryFilters } from '@/components/BeneficiaryFilters'
import type { BeneficiaryFilterValues } from '@/components/BeneficiaryFilters'
import { Drawer } from '@/components/Drawer'
import { Sidebar } from '@/components/Sidebar'
import { Table } from '@/components/Table'
import { beneficiaryTableColumns } from '@/config/beneficiaryTableColumns'
import type { Beneficiary } from '@/data/mockBeneficiary'
import { PATHS } from '@/routes/paths'
import { getBeneficiaries, getBeneficiary } from '@/services/beneficiary'
import { maskCNPJ } from '@/utils/masks'

const PAGE_SIZE = 4
const emptyFilters: BeneficiaryFilterValues = {
  companyOrCnpj: '',
  search: '',
  country: '',
  currency: '',
  status: '',
}
const normalize = (value: string) => value.toLocaleLowerCase('pt-BR')
const sidebarMenuItems = [
  { id: 'home', label: 'Início', path: PATHS.HOME },
  { id: 'beneficiaries', label: 'Beneficiários', path: PATHS.ADMIN_BENEFICIARIES },
  { id: 'transfers', label: 'Transferências', path: '/transfers' },
  { id: 'settings', label: 'Configurações', path: '/settings' },
].map((item) => ({ ...item, icon: <span aria-hidden="true" /> }))

function BeneficiaryView() {
  const navigate = useNavigate()
  const location = useLocation()
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters)
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null)
  const [details, setDetails] = useState<Beneficiary | null>(null)
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const data = await getBeneficiaries()
        if (active) setBeneficiaries(data)
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
  }, [])

  const activeItemId = useMemo(
    () => sidebarMenuItems.find((item) => item.path === location.pathname)?.id ?? 'beneficiaries',
    [location.pathname],
  )
  const statuses = [...new Set(beneficiaries.map((item) => item.status))]
  const countries = [...new Set(beneficiaries.map((item) => item.country))]
  const currencies = [...new Set(beneficiaries.map((item) => item.currency))]
  const filteredBeneficiaries = beneficiaries.filter((beneficiary) => {
    const companyOrCnpj = normalize(appliedFilters.companyOrCnpj.trim())
    const search = normalize(appliedFilters.search.trim())
    return (
      (!companyOrCnpj ||
        normalize(beneficiary.empresa).includes(companyOrCnpj) ||
        normalize(beneficiary.cnpj).includes(companyOrCnpj)) &&
      (!search || normalize(beneficiary.nome).includes(search)) &&
      (!appliedFilters.country || beneficiary.country === appliedFilters.country) &&
      (!appliedFilters.currency || beneficiary.currency === appliedFilters.currency) &&
      (!appliedFilters.status || beneficiary.status === appliedFilters.status)
    )
  })
  const visibleBeneficiaries = filteredBeneficiaries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )
  const totalPages = Math.max(1, Math.ceil(filteredBeneficiaries.length / PAGE_SIZE))

  const openDetails = async (beneficiary: Beneficiary) => {
    setSelectedBeneficiary(beneficiary)
    setDetails(null)
    setDetailsError(null)
    setIsDetailsLoading(true)
    try {
      setDetails(await getBeneficiary(beneficiary.id))
    } catch {
      setDetailsError('Não foi possível carregar os detalhes do beneficiário.')
    } finally {
      setIsDetailsLoading(false)
    }
  }
  const closeDetails = () => {
    setSelectedBeneficiary(null)
    setDetails(null)
  }
  const selectedDetails = details ?? selectedBeneficiary

  return (
    <div className="flex min-h-screen bg-[#F1F5F9]">
      <Sidebar
        className="sticky top-0"
        logo={
          <span className="sidebar__brand">
            V-<span className="sidebar__brand-accent">Stable</span>
          </span>
        }
        items={sidebarMenuItems.map((item) => ({ ...item, onClick: () => navigate(item.path) }))}
        activeItemId={activeItemId}
        account={{ name: 'V-Stable Admin', description: 'Operações & Compliance', initials: 'CA' }}
      />
      <main className="min-h-screen w-full px-6 py-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
          <header>
            <h1 className="text-2xl font-bold text-[#0F172A]">Beneficiários</h1>
            <p className="mt-1 text-xs text-[#64748B]">
              Consulta global de beneficiários cadastrados na plataforma.
            </p>
          </header>
          <BeneficiaryFilters
            countries={countries}
            currencies={currencies}
            statuses={statuses}
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
            <p role="status" className="rounded-lg bg-white px-6 py-5 text-sm text-[#475569]">
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
            <p role="status" className="rounded-lg bg-white px-6 py-5 text-sm text-[#475569]">
              Nenhum beneficiário cadastrado.
            </p>
          )}
          {!isLoading &&
            !loadError &&
            beneficiaries.length > 0 &&
            filteredBeneficiaries.length === 0 && (
              <p role="status" className="rounded-lg bg-white px-6 py-5 text-sm text-[#475569]">
                Nenhum beneficiário encontrado para os filtros informados.
              </p>
            )}
          {!isLoading && !loadError && filteredBeneficiaries.length > 0 && (
            <Table
              title="Todos os beneficiários"
              entityLabel="beneficiários"
              totalRecords={filteredBeneficiaries.length}
              columns={beneficiaryTableColumns}
              data={visibleBeneficiaries}
              actions={[{ label: 'Ver detalhes', onClick: openDetails }]}
              pagination={{
                currentPage,
                totalPages,
                displayedRecords: visibleBeneficiaries.length,
                itemsPerPage: PAGE_SIZE,
                totalRecords: filteredBeneficiaries.length,
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
            <dl className="space-y-5 text-sm text-[#0F172A]">
              <div>
                <dt className="text-xs font-medium uppercase text-[#64748B]">Beneficiário</dt>
                <dd className="mt-1 text-base font-semibold">{selectedDetails.nome}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-[#64748B]">
                  Empresa proprietária
                </dt>
                <dd className="mt-1">{selectedDetails.empresa}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-[#64748B]">CNPJ</dt>
                <dd className="mt-1">{maskCNPJ(selectedDetails.cnpj)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-[#64748B]">País</dt>
                <dd className="mt-1">{selectedDetails.country}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-[#64748B]">Moeda</dt>
                <dd className="mt-1">{selectedDetails.currency}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-[#64748B]">Status</dt>
                <dd className="mt-1">{selectedDetails.status}</dd>
              </div>
            </dl>
          )}
        </Drawer>
      </main>
    </div>
  )
}

export default BeneficiaryView
