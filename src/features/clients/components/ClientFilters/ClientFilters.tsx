import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Input } from '@/shared/components/Input'
import { Select } from '@/shared/components/Select'

export interface ClientFilterValues {
  search: string
  status: string
  city: string
  period: string
}

interface ClientFiltersProps {
  statuses: string[]
  cities: string[]
  periods: string[]
  onApply: (filters: ClientFilterValues) => void
  onClear: () => void
  /** Quando verdadeiro, exibe um botão de filtro que abre o formulário em popover. */
  collapsible?: boolean
}

const initialFilters: ClientFilterValues = {
  search: '',
  status: '',
  city: '',
  period: '',
}

export function ClientFilters({
  statuses,
  cities,
  periods,
  onApply,
  onClear,
  collapsible = false,
}: ClientFiltersProps) {
  const [filters, setFilters] = useState<ClientFilterValues>(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState<ClientFilterValues>(initialFilters)
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

  const updateFilter = (field: keyof ClientFilterValues, value: string) => {
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

  // Mesma altura dos botões Limpar e Filtrar; o resto do visual vem dos componentes.
  const fieldClassName = 'h-11 py-0! text-sm!'
  const labelClassName = 'mb-1.5 block'

  const formContent = (
    <form
      aria-label="Filtros de clientes"
      onSubmit={handleSubmit}
      className={collapsible ? '' : 'rounded-lg bg-white p-5'}
    >
      <h2 className="mb-4 text-base font-semibold text-slate-900">Filtros</h2>

      <div
        className={`grid grid-cols-1 gap-3 ${
          collapsible
            ? 'sm:grid-cols-2'
            : 'lg:grid-cols-[1.35fr_0.95fr_0.95fr_0.95fr_auto_auto] lg:items-end'
        }`}
      >
        <div className="text-xs font-medium text-slate-900">
          <label htmlFor="client-filter-search" className={labelClassName}>
            Empresa ou CNPJ
          </label>
          <Input
            id="client-filter-search"
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            placeholder="Buscar por razão social ou CNPJ"
            className={fieldClassName}
          />
        </div>

        <div className="text-xs font-medium text-slate-900">
          <label htmlFor="client-filter-status" className={labelClassName}>
            Status
          </label>
          <Select
            id="client-filter-status"
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
            options={[
              { value: '', label: 'Todos os status' },
              ...statuses.map((status) => ({ value: status, label: status })),
            ]}
            className={fieldClassName}
          />
        </div>

        <div className="text-xs font-medium text-slate-900">
          <label htmlFor="client-filter-city" className={labelClassName}>
            Cidade / UF
          </label>
          <Select
            id="client-filter-city"
            value={filters.city}
            onChange={(event) => updateFilter('city', event.target.value)}
            options={[
              { value: '', label: 'Todas as localidades' },
              ...cities.map((city) => ({ value: city, label: city })),
            ]}
            className={fieldClassName}
          />
        </div>

        <div className="text-xs font-medium text-slate-900">
          <label htmlFor="client-filter-period" className={labelClassName}>
            Período de cadastro
          </label>
          <Select
            id="client-filter-period"
            value={filters.period}
            onChange={(event) => updateFilter('period', event.target.value)}
            options={[
              { value: '', label: 'Selecionar período' },
              ...periods.map((period) => ({ value: period, label: period })),
            ]}
            className={fieldClassName}
          />
        </div>

        <div
          className={`flex gap-3 ${collapsible ? 'sm:col-span-2 justify-end pt-1' : 'contents'}`}
        >
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
      </div>
    </form>
  )

  if (collapsible) {
    const hasActivePopoverFilter =
      appliedFilters.status !== '' || appliedFilters.city !== '' || appliedFilters.period !== ''

    return (
      <div
        ref={containerRef}
        className="relative flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-2"
      >
        <form
          aria-label="Buscar clientes"
          onSubmit={handleSubmit}
          className="flex min-w-[240px] flex-1 items-center gap-2 sm:max-w-md"
        >
          <div className="relative flex-1">
            <svg
              aria-hidden="true"
              data-testid="client-search-icon"
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
            <Input
              id="client-filter-search"
              aria-label="Empresa ou CNPJ"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Buscar por razão social ou CNPJ"
              className={`${fieldClassName} pl-9`}
            />
          </div>
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
            aria-label="Filtrar clientes"
            aria-expanded={open}
            aria-haspopup="true"
            onClick={() => setOpen((current) => !current)}
            className="relative inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-sage-300 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-xs transition-colors hover:border-primary hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg
              aria-hidden="true"
              data-testid="client-filter-funnel-icon"
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
              aria-label="Filtros de clientes"
              onSubmit={handleSubmit}
              className="absolute right-0 top-full z-20 mt-2 flex w-[min(92vw,360px)] flex-col gap-3 rounded-xl border border-sage-300 bg-white p-4 shadow-lg"
            >
              <h2 className="text-sm font-semibold text-slate-900">Filtros</h2>

              <div className="text-xs font-medium text-slate-900">
                <label htmlFor="client-filter-status" className={labelClassName}>
                  Status
                </label>
                <Select
                  id="client-filter-status"
                  value={filters.status}
                  onChange={(event) => updateFilter('status', event.target.value)}
                  options={[
                    { value: '', label: 'Todos os status' },
                    ...statuses.map((status) => ({ value: status, label: status })),
                  ]}
                  className={fieldClassName}
                />
              </div>

              <div className="text-xs font-medium text-slate-900">
                <label htmlFor="client-filter-city" className={labelClassName}>
                  Cidade / UF
                </label>
                <Select
                  id="client-filter-city"
                  value={filters.city}
                  onChange={(event) => updateFilter('city', event.target.value)}
                  options={[
                    { value: '', label: 'Todas as localidades' },
                    ...cities.map((city) => ({ value: city, label: city })),
                  ]}
                  className={fieldClassName}
                />
              </div>

              <div className="text-xs font-medium text-slate-900">
                <label htmlFor="client-filter-period" className={labelClassName}>
                  Período de cadastro
                </label>
                <Select
                  id="client-filter-period"
                  value={filters.period}
                  onChange={(event) => updateFilter('period', event.target.value)}
                  options={[
                    { value: '', label: 'Selecionar período' },
                    ...periods.map((period) => ({ value: period, label: period })),
                  ]}
                  className={fieldClassName}
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

  return formContent
}
