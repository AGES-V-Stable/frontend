import { useState } from 'react'
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

  // Mesma altura dos botões Limpar e Filtrar; o resto do visual vem dos componentes.
  const fieldClassName = 'h-11 py-0! text-sm!'
  const labelClassName = 'mb-1.5 block'

  return (
    <form
      aria-label="Filtros de clientes PME"
      onSubmit={handleSubmit}
      className="rounded-lg bg-white p-5"
    >
      <h2 className="mb-4 text-base font-semibold text-slate-900">Filtros</h2>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.35fr_0.95fr_0.95fr_0.95fr_auto_auto] lg:items-end">
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
