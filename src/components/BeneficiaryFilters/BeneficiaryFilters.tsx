import { useState } from 'react'
import type { FormEvent } from 'react'

export interface BeneficiaryFilterValues {
  companyOrCnpj: string
  search: string
  country: string
  currency: string
  status: string
}

interface BeneficiaryFiltersProps {
  countries: string[]
  currencies: string[]
  statuses: string[]
  onApply: (filters: BeneficiaryFilterValues) => void
  onClear: () => void
}

const initialFilters: BeneficiaryFilterValues = {
  companyOrCnpj: '',
  search: '',
  country: '',
  currency: '',
  status: '',
}

export function BeneficiaryFilters({
  countries,
  currencies,
  statuses,
  onApply,
  onClear,
}: BeneficiaryFiltersProps) {
  const [filters, setFilters] = useState<BeneficiaryFilterValues>(initialFilters)

  const updateFilter = (field: keyof BeneficiaryFilterValues, value: string) => {
    setFilters((currentFilters) => ({ ...currentFilters, [field]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onApply(filters)
  }

  const handleClear = () => {
    setFilters(initialFilters)
    onClear()
  }

  const inputClassName =
    'h-11 w-full rounded-md border border-[#BBCABF] bg-white px-3 text-sm text-[#0F172A] outline-none placeholder:text-[#718096] focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20'

  return (
    <form
      aria-label="Filtros de beneficiários"
      onSubmit={handleSubmit}
      className="rounded-lg bg-white p-5"
    >
      <h2 className="mb-4 text-base font-semibold text-[#0F172A]">Filtros</h2>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.35fr_1.35fr_0.95fr_0.95fr_0.95fr_auto_auto] lg:items-end">
        <label className="text-xs font-medium text-[#0F172A]">
          Empresa ou CNPJ
          <input
            className={`${inputClassName} mt-1.5`}
            value={filters.companyOrCnpj}
            onChange={(event) => updateFilter('companyOrCnpj', event.target.value)}
            placeholder="Buscar por empresa ou CNPJ"
          />
        </label>

        <label className="text-xs font-medium text-[#0F172A]">
          Busca
          <input
            className={`${inputClassName} mt-1.5`}
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            placeholder="Buscar beneficiário"
          />
        </label>

        <label className="text-xs font-medium text-[#0F172A]">
          País
          <select
            aria-label="País"
            className={`${inputClassName} mt-1.5`}
            value={filters.country}
            onChange={(event) => updateFilter('country', event.target.value)}
          >
            <option value="">Todos os países</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-[#0F172A]">
          Moeda
          <select
            aria-label="Moeda"
            className={`${inputClassName} mt-1.5`}
            value={filters.currency}
            onChange={(event) => updateFilter('currency', event.target.value)}
          >
            <option value="">Todas as moedas</option>
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-[#0F172A]">
          Status
          <select
            aria-label="Status"
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

        <button
          type="button"
          onClick={handleClear}
          className="h-11 rounded-md border border-[#059669] px-6 text-sm font-medium text-[#059669] transition-colors hover:bg-[#ECFDF5] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
        >
          Limpar
        </button>
        <button
          type="submit"
          className="h-11 rounded-md bg-[#059669] px-6 text-sm font-medium text-white transition-colors hover:bg-[#047857] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
        >
          Filtrar
        </button>
      </div>
    </form>
  )
}
