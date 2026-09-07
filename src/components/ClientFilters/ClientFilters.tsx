import { useState } from 'react'
import type { FormEvent } from 'react'

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
}

const initialFilters: ClientFilterValues = {
  search: '',
  status: '',
  city: '',
  period: '',
}

export function ClientFilters({ statuses, cities, periods, onApply, onClear }: ClientFiltersProps) {
  const [filters, setFilters] = useState<ClientFilterValues>(initialFilters)

  const updateFilter = (field: keyof ClientFilterValues, value: string) => {
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
      aria-label="Filtros de clientes PME"
      onSubmit={handleSubmit}
      className="rounded-lg bg-white p-5"
    >
      <h2 className="mb-4 text-base font-semibold text-[#0F172A]">Filtros</h2>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.35fr_0.95fr_0.95fr_0.95fr_auto_auto] lg:items-end">
        <label className="text-xs font-medium text-[#0F172A]">
          Empresa ou CNPJ
          <input
            className={`${inputClassName} mt-1.5`}
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            placeholder="Buscar por razão social ou CNPJ"
          />
        </label>

        <label className="text-xs font-medium text-[#0F172A]">
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

        <label className="text-xs font-medium text-[#0F172A]">
          Cidade / UF
          <select
            className={`${inputClassName} mt-1.5`}
            value={filters.city}
            onChange={(event) => updateFilter('city', event.target.value)}
          >
            <option value="">Todas as localidades</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-[#0F172A]">
          Período de cadastro
          <select
            className={`${inputClassName} mt-1.5`}
            value={filters.period}
            onChange={(event) => updateFilter('period', event.target.value)}
          >
            <option value="">Selecionar período</option>
            {periods.map((period) => (
              <option key={period} value={period}>
                {period}
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
