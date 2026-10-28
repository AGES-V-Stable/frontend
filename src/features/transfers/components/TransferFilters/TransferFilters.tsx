import { useState } from 'react'
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
  onApply: (filters: TransferFilterValues) => void
  onClear: () => void
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

export function TransferFilters({ statuses, types, onApply, onClear }: TransferFiltersProps) {
  const [filters, setFilters] = useState<TransferFilterValues>(initialFilters)
  const [error, setError] = useState<string | null>(null)

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
    onApply(filters)
  }

  const handleClear = () => {
    setFilters(initialFilters)
    setError(null)
    onClear()
  }

  const inputClassName =
    'h-11 w-full rounded-md border border-sage-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20'

  return (
    <form
      aria-label="Filtros de transferências"
      onSubmit={handleSubmit}
      className="rounded-lg bg-white p-5"
    >
      <h2 className="mb-4 text-base font-semibold text-slate-900">Filtros</h2>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <label className="text-xs font-medium text-slate-900">
          Empresa ou CNPJ
          <input
            className={`${inputClassName} mt-1.5`}
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            placeholder="Buscar por empresa ou CNPJ"
          />
        </label>

        <label className="text-xs font-medium text-slate-900">
          Beneficiário
          <input
            className={`${inputClassName} mt-1.5`}
            value={filters.beneficiary}
            onChange={(event) => updateFilter('beneficiary', event.target.value)}
            placeholder="Buscar por beneficiário"
          />
        </label>

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
          className="h-11 rounded-md border border-primary px-6 text-sm font-medium text-primary transition-colors hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          Limpar
        </button>
        <button
          type="submit"
          className="h-11 rounded-md bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          Filtrar
        </button>
      </div>
    </form>
  )
}
