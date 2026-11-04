import { useState } from 'react'
import type { FormEvent } from 'react'

import { useCompanyOptions } from '@/features/dashboard/hooks/useCompanyOptions'
import type { DashboardFilterForm, PeriodPreset } from '@/features/dashboard/types/dashboardFilters'
import {
  DEFAULT_FILTER_FORM,
  MAX_DATE,
  MIN_DATE,
  PRESET_OPTIONS,
  validateFilterForm,
} from '@/features/dashboard/utils/period'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Select } from '@/shared/components/Select'

export interface DashboardFiltersProps {
  admin: boolean
  onApply: (form: DashboardFilterForm) => void
}

const ALL_COMPANIES = { value: '', label: 'Todas as empresas' }

/** Filtros aplicados juntos a todos os widgets; só valem depois de "Aplicar filtros". */
export function DashboardFilters({ admin, onApply }: DashboardFiltersProps) {
  const [form, setForm] = useState<DashboardFilterForm>(DEFAULT_FILTER_FORM)
  const [error, setError] = useState<string | null>(null)
  const companies = useCompanyOptions(admin)

  const update = (field: keyof DashboardFilterForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateFilterForm(form)
    setError(validationError)
    if (!validationError) onApply(form)
  }

  const handleClear = () => {
    setForm(DEFAULT_FILTER_FORM)
    setError(null)
    onApply(DEFAULT_FILTER_FORM)
  }

  const companyOptions =
    companies.state.status === 'ready'
      ? [ALL_COMPANIES, ...companies.state.companies.map((c) => ({ value: c.id, label: c.name }))]
      : [
          companies.state.status === 'loading'
            ? { value: '', label: 'Carregando empresas...' }
            : ALL_COMPANIES,
        ]

  return (
    <form
      aria-label="Filtrar dados"
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border border-sage-300 bg-white p-4"
    >
      <h2 className="mb-3 text-sm font-bold text-slate-900">Filtrar dados</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] lg:items-end">
        {admin && (
          <div className="flex flex-col gap-1">
            <Select
              label="Empresa"
              value={form.companyId}
              options={companyOptions}
              disabled={companies.state.status !== 'ready'}
              onChange={(event) => update('companyId', event.target.value)}
            />
            {companies.state.status === 'error' && (
              <p className="text-sm text-slate-700">
                Não foi possível carregar as empresas.{' '}
                <button
                  type="button"
                  onClick={companies.retry}
                  className="cursor-pointer font-medium text-primary underline"
                >
                  Tentar novamente
                </button>
              </p>
            )}
          </div>
        )}
        <Select
          label="Período"
          value={form.preset}
          options={PRESET_OPTIONS}
          onChange={(event) => update('preset', event.target.value as PeriodPreset)}
        />
        {form.preset === 'CUSTOM' && (
          <>
            <Input
              label="Data inicial"
              type="date"
              min={MIN_DATE}
              max={MAX_DATE}
              value={form.startDate}
              onChange={(event) => update('startDate', event.target.value)}
            />
            <Input
              label="Data final"
              type="date"
              min={MIN_DATE}
              max={MAX_DATE}
              value={form.endDate}
              onChange={(event) => update('endDate', event.target.value)}
            />
          </>
        )}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="tertiary"
            label="Limpar filtros"
            className="!w-auto !px-4"
            onClick={handleClear}
          />
          <Button type="submit" variant="neutral" label="Aplicar filtros" />
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  )
}
