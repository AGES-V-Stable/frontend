import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Select } from '@/shared/components/Select'

export interface BeneficiaryFilterValues {
  companyOrCnpj: string
  search: string
  country: string
}

interface BeneficiaryFiltersProps {
  countries: string[]
  onApply: (filters: BeneficiaryFilterValues) => void
  onClear: () => void
  hideCompanyFilter?: boolean
  embedded?: boolean
  /** Mantém a barra de busca fixa e recolhe os demais filtros em um botão de funil. */
  collapsible?: boolean
}

const initialFilters: BeneficiaryFilterValues = {
  companyOrCnpj: '',
  search: '',
  country: '',
}

export function BeneficiaryFilters({
  countries,
  onApply,
  onClear,
  hideCompanyFilter = false,
  embedded = false,
  collapsible = false,
}: BeneficiaryFiltersProps) {
  const [filters, setFilters] = useState<BeneficiaryFilterValues>(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState<BeneficiaryFilterValues>(initialFilters)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!collapsible || !open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [collapsible, open])

  const updateFilter = (field: keyof BeneficiaryFilterValues, value: string) => {
    setFilters((currentFilters) => ({ ...currentFilters, [field]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedFilters(filters)
    onApply(filters)
    if (collapsible) setOpen(false)
  }

  const handleClear = () => {
    setFilters(initialFilters)
    setAppliedFilters(initialFilters)
    onClear()
    if (collapsible) setOpen(false)
  }

  const inputClassName =
    'h-11 w-full rounded-lg border border-sage-500 bg-surface px-3 text-sm text-slate-900 placeholder:text-gray-500 focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

  const searchField = (
    <div className="relative flex-1">
      <svg
        aria-hidden="true"
        data-testid="beneficiary-search-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        aria-label="Busca"
        className={`${inputClassName} pl-9`}
        value={filters.search}
        onChange={(event) => updateFilter('search', event.target.value)}
        placeholder="Buscar beneficiário"
      />
    </div>
  )

  if (collapsible) {
    const hasActivePopoverFilter =
      appliedFilters.country !== '' || (!hideCompanyFilter && appliedFilters.companyOrCnpj !== '')

    return (
      <div
        ref={containerRef}
        className={`relative flex flex-wrap items-center justify-between gap-3 ${
          embedded ? 'px-6 pt-5 pb-2' : 'rounded-lg bg-white p-5'
        }`}
      >
        <form
          aria-label="Buscar beneficiários"
          onSubmit={handleSubmit}
          className="flex min-w-[240px] flex-1 items-center gap-2 sm:max-w-md"
        >
          {searchField}
          <button
            type="submit"
            className="h-11 shrink-0 cursor-pointer rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Buscar
          </button>
        </form>

        <div className="relative">
          <button
            type="button"
            aria-label="Filtrar beneficiários"
            aria-expanded={open}
            aria-haspopup="true"
            onClick={() => setOpen((current) => !current)}
            className="relative inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-sage-300 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-xs transition-colors hover:border-primary hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg
              aria-hidden="true"
              data-testid="beneficiary-filter-funnel-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 text-primary"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filtros</span>
            {hasActivePopoverFilter && (
              <span aria-label="Filtros ativos" className="size-2 rounded-full bg-primary" />
            )}
          </button>

          {open && (
            <form
              aria-label="Filtros de beneficiários"
              onSubmit={handleSubmit}
              className="absolute right-0 top-full z-20 mt-2 flex w-[min(92vw,340px)] flex-col gap-3 rounded-xl border border-sage-300 bg-white p-4 shadow-lg"
            >
              <h2 className="text-sm font-semibold text-slate-900">Filtros</h2>

              {!hideCompanyFilter && (
                <label className="text-xs font-medium text-slate-900">
                  Empresa ou CNPJ
                  <input
                    className={`${inputClassName} mt-1.5`}
                    value={filters.companyOrCnpj}
                    onChange={(event) => updateFilter('companyOrCnpj', event.target.value)}
                    placeholder="Buscar por empresa ou CNPJ"
                  />
                </label>
              )}

              <div className="text-xs font-medium text-slate-900">
                <label htmlFor="beneficiary-filter-country" className="mb-1.5 block">
                  País
                </label>
                <Select
                  id="beneficiary-filter-country"
                  value={filters.country}
                  onChange={(event) => updateFilter('country', event.target.value)}
                  options={[
                    { value: '', label: 'Todos os países' },
                    ...countries.map((country) => ({ value: country, label: country })),
                  ]}
                  className="h-11 py-0! text-sm!"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-10 cursor-pointer rounded-md border border-primary px-4 text-sm font-medium text-primary transition-colors hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Limpar
                </button>
                <button
                  type="submit"
                  className="h-10 cursor-pointer rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Filtrar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <form
      aria-label="Filtros de beneficiários"
      onSubmit={handleSubmit}
      className={embedded ? 'px-6 pt-6 pb-2' : 'rounded-lg bg-white p-5'}
    >
      {!embedded && <h2 className="mb-4 text-base font-semibold text-slate-900">Filtros</h2>}

      <div
        className={`grid grid-cols-1 gap-3 ${hideCompanyFilter ? 'lg:grid-cols-[1.35fr_0.95fr_auto_auto]' : 'lg:grid-cols-[1.35fr_1.35fr_0.95fr_auto_auto]'} lg:items-end`}
      >
        {!hideCompanyFilter && (
          <label className="text-xs font-medium text-slate-900">
            Empresa ou CNPJ
            <input
              className={`${inputClassName} mt-1.5`}
              value={filters.companyOrCnpj}
              onChange={(event) => updateFilter('companyOrCnpj', event.target.value)}
              placeholder="Buscar por empresa ou CNPJ"
            />
          </label>
        )}

        <label className="text-xs font-medium text-slate-900">
          Busca
          <div className="relative mt-1.5">
            <svg
              aria-hidden="true"
              data-testid="beneficiary-search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              className={`${inputClassName} pl-9`}
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Buscar beneficiário"
            />
          </div>
        </label>

        <div className="text-xs font-medium text-slate-900">
          <label htmlFor="beneficiary-filter-country" className="mb-1.5 block">
            País
          </label>
          <Select
            id="beneficiary-filter-country"
            value={filters.country}
            onChange={(event) => updateFilter('country', event.target.value)}
            options={[
              { value: '', label: 'Todos os países' },
              ...countries.map((country) => ({ value: country, label: country })),
            ]}
            className="h-11 py-0! text-sm!"
          />
        </div>

        <button
          type="button"
          onClick={handleClear}
          className="h-11 rounded-md border border-primary px-6 text-sm font-medium text-primary transition-colors hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Limpar
        </button>
        <button
          type="submit"
          className="h-11 rounded-md bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Filtrar
        </button>
      </div>
    </form>
  )
}
