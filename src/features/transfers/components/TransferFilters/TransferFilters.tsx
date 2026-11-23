import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

export interface TransferFilterValues {
  search: string
  beneficiary: string
  startDate: string
  endDate: string
  minAmount: string
  maxAmount: string
  status: string
  type: string
}

interface TransferFiltersProps {
  statuses: string[]
  types: string[]
  /** Lista de nomes de beneficiários para seleção com busca no dropdown. */
  beneficiaries?: string[]
  onApply: (filters: TransferFilterValues) => void
  onClear: () => void
  /** Quando verdadeiro, exibe um botão de filtro que abre o formulário em popover. */
  collapsible?: boolean
}

const initialFilters: TransferFilterValues = {
  search: '',
  beneficiary: '',
  startDate: '',
  endDate: '',
  minAmount: '',
  maxAmount: '',
  status: '',
  type: '',
}

export function TransferFilters({
  statuses,
  types,
  beneficiaries = [],
  onApply,
  onClear,
  collapsible = false,
}: TransferFiltersProps) {
  const [filters, setFilters] = useState<TransferFilterValues>(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState<TransferFilterValues>(initialFilters)
  const [open, setOpen] = useState(false)
  const [beneficiaryOpen, setBeneficiaryOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const beneficiaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!beneficiaryOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (beneficiaryRef.current && !beneficiaryRef.current.contains(event.target as Node)) {
        setBeneficiaryOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [beneficiaryOpen])

  const filteredBeneficiaries = beneficiaries.filter((name) =>
    name.toLowerCase().includes(filters.beneficiary.trim().toLowerCase()),
  )

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

  const updateFilter = (field: keyof TransferFilterValues, value: string) => {
    setFilters((currentFilters) => ({ ...currentFilters, [field]: value }))
  }

  const validate = (): string | null => {
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      return 'A data inicial não pode ser posterior à data final.'
    }

    const min = filters.minAmount === '' ? null : Number(filters.minAmount)
    const max = filters.maxAmount === '' ? null : Number(filters.maxAmount)

    if (min !== null && min < 0) {
      return 'O valor mínimo não pode ser negativo.'
    }
    if (min !== null && max !== null && min > max) {
      return 'O valor mínimo não pode ser maior que o valor máximo.'
    }

    return null
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setAppliedFilters(filters)
    onApply(filters)
    if (collapsible) setOpen(false)
  }

  const handleClear = () => {
    setFilters(initialFilters)
    setAppliedFilters(initialFilters)
    setError(null)
    onClear()
    if (collapsible) setOpen(false)
  }

  const inputClassName =
    'h-11 w-full rounded-md border border-sage-500 bg-white px-3 text-sm text-slate-900 placeholder:text-gray-500 focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

  const formContent = (
    <form
      aria-label="Filtros de transferências"
      onSubmit={handleSubmit}
      className={collapsible ? '' : 'rounded-lg bg-white p-5'}
    >
      <h2 className="mb-4 text-base font-semibold text-slate-900">Filtros</h2>

      <div
        className={`grid grid-cols-1 gap-3 ${collapsible ? 'sm:grid-cols-2' : 'lg:grid-cols-4'}`}
      >
        <label className="text-xs font-medium text-slate-900">
          Empresa ou CNPJ
          <input
            className={`${inputClassName} mt-1.5`}
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            placeholder="Buscar por empresa ou CNPJ"
          />
        </label>

        <div ref={beneficiaryRef} className="relative text-xs font-medium text-slate-900">
          <label htmlFor="transfer-filter-beneficiary" className="block">
            Beneficiário
          </label>
          <div className="relative mt-1.5">
            <input
              id="transfer-filter-beneficiary"
              role={beneficiaries.length > 0 ? 'combobox' : undefined}
              aria-expanded={beneficiaries.length > 0 ? beneficiaryOpen : undefined}
              aria-autocomplete={beneficiaries.length > 0 ? 'list' : undefined}
              className={`${inputClassName} ${beneficiaries.length > 0 ? 'pr-9' : ''}`}
              value={filters.beneficiary}
              onFocus={() => {
                if (beneficiaries.length > 0) setBeneficiaryOpen(true)
              }}
              onChange={(event) => {
                updateFilter('beneficiary', event.target.value)
                if (beneficiaries.length > 0) setBeneficiaryOpen(true)
              }}
              placeholder="Buscar por beneficiário"
            />
            {beneficiaries.length > 0 && (
              <button
                type="button"
                aria-label="Abrir lista de beneficiários"
                onClick={() => setBeneficiaryOpen((current) => !current)}
                className="absolute inset-y-0 right-2 flex cursor-pointer items-center text-slate-500 hover:text-slate-900"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`size-4 transition-transform ${beneficiaryOpen ? 'rotate-180' : ''}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            )}
          </div>
          {beneficiaries.length > 0 && beneficiaryOpen && (
            <ul
              role="listbox"
              aria-label="Beneficiários"
              className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-md border border-sage-300 bg-white py-1 shadow-md"
            >
              {filteredBeneficiaries.length > 0 ? (
                filteredBeneficiaries.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={filters.beneficiary === name}
                      onClick={() => {
                        updateFilter('beneficiary', name)
                        setBeneficiaryOpen(false)
                      }}
                      className="w-full cursor-pointer px-3 py-2 text-left text-sm font-normal text-slate-900 hover:bg-emerald-50"
                    >
                      {name}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-xs font-normal text-slate-500">
                  Nenhum beneficiário encontrado.
                </li>
              )}
            </ul>
          )}
        </div>

        <label className="text-xs font-medium text-slate-900">
          Status
          <select
            className={`${inputClassName} mt-1.5`}
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
          >
            <option value="">Todos os status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-slate-900">
          Tipo
          <select
            className={`${inputClassName} mt-1.5`}
            value={filters.type}
            onChange={(event) => updateFilter('type', event.target.value)}
          >
            <option value="">Todos os tipos</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-slate-900">
          Data inicial
          <input
            type="date"
            className={`${inputClassName} mt-1.5`}
            value={filters.startDate}
            onChange={(event) => updateFilter('startDate', event.target.value)}
          />
        </label>

        <label className="text-xs font-medium text-slate-900">
          Data final
          <input
            type="date"
            className={`${inputClassName} mt-1.5`}
            value={filters.endDate}
            onChange={(event) => updateFilter('endDate', event.target.value)}
          />
        </label>

        <label className="text-xs font-medium text-slate-900">
          Valor mínimo
          <input
            type="number"
            step="0.01"
            className={`${inputClassName} mt-1.5`}
            value={filters.minAmount}
            onChange={(event) => updateFilter('minAmount', event.target.value)}
            placeholder="0,00"
          />
        </label>

        <label className="text-xs font-medium text-slate-900">
          Valor máximo
          <input
            type="number"
            step="0.01"
            className={`${inputClassName} mt-1.5`}
            value={filters.maxAmount}
            onChange={(event) => updateFilter('maxAmount', event.target.value)}
            placeholder="0,00"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-3">
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

  if (!collapsible) return formContent

  const hasActiveFilter =
    appliedFilters.status !== '' ||
    appliedFilters.type !== '' ||
    appliedFilters.startDate !== '' ||
    appliedFilters.endDate !== '' ||
    appliedFilters.minAmount !== '' ||
    appliedFilters.maxAmount !== ''

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 flex-wrap items-center justify-between gap-3"
    >
      <form
        aria-label="Buscar transferências"
        onSubmit={handleSubmit}
        className="flex min-w-[240px] flex-1 items-center gap-2 sm:max-w-md"
      >
        <div className="relative flex-1">
          <svg
            aria-hidden="true"
            data-testid="transfer-search-icon"
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
            aria-label="Buscar transferência"
            className="h-11 w-full rounded-lg border border-sage-500 bg-surface pl-9 pr-3 text-sm text-slate-900 placeholder:text-gray-500 focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            placeholder="Buscar transferência"
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
          aria-label="Filtrar transferências"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((current) => !current)}
          className="relative inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-sage-300 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-xs transition-colors hover:border-primary hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <svg
            aria-hidden="true"
            data-testid="transfer-filter-funnel-icon"
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
          {hasActiveFilter && (
            <span aria-label="Filtros ativos" className="size-2 rounded-full bg-primary" />
          )}
        </button>
        {open && (
          <form
            aria-label="Filtros de transferências"
            onSubmit={handleSubmit}
            className="absolute right-0 top-full z-20 mt-2 w-[min(92vw,540px)] rounded-xl border border-sage-300 bg-white p-5 shadow-lg"
          >
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Filtros</h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-900">
                Status
                <select
                  className={`${inputClassName} mt-1.5`}
                  value={filters.status}
                  onChange={(event) => updateFilter('status', event.target.value)}
                >
                  <option value="">Todos os status</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-medium text-slate-900">
                Tipo
                <select
                  className={`${inputClassName} mt-1.5`}
                  value={filters.type}
                  onChange={(event) => updateFilter('type', event.target.value)}
                >
                  <option value="">Todos os tipos</option>
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-medium text-slate-900">
                Data inicial
                <input
                  type="date"
                  className={`${inputClassName} mt-1.5`}
                  value={filters.startDate}
                  onChange={(event) => updateFilter('startDate', event.target.value)}
                />
              </label>

              <label className="text-xs font-medium text-slate-900">
                Data final
                <input
                  type="date"
                  className={`${inputClassName} mt-1.5`}
                  value={filters.endDate}
                  onChange={(event) => updateFilter('endDate', event.target.value)}
                />
              </label>

              <label className="text-xs font-medium text-slate-900">
                Valor mínimo
                <input
                  type="number"
                  step="0.01"
                  className={`${inputClassName} mt-1.5`}
                  value={filters.minAmount}
                  onChange={(event) => updateFilter('minAmount', event.target.value)}
                  placeholder="0,00"
                />
              </label>

              <label className="text-xs font-medium text-slate-900">
                Valor máximo
                <input
                  type="number"
                  step="0.01"
                  className={`${inputClassName} mt-1.5`}
                  value={filters.maxAmount}
                  onChange={(event) => updateFilter('maxAmount', event.target.value)}
                  placeholder="0,00"
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="mt-3 text-xs font-medium text-red-600">
                {error}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
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
