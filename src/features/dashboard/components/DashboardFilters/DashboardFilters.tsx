import { useEffect, useRef, useState } from 'react'
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
  /** Quando verdadeiro, exibe um botão compacto de funil que abre os filtros em popover. */
  collapsible?: boolean
}

const ALL_COMPANIES = { value: '', label: 'Todas as empresas' }

function isDefaultForm(form: DashboardFilterForm): boolean {
  return (
    form.preset === DEFAULT_FILTER_FORM.preset &&
    form.companyId === DEFAULT_FILTER_FORM.companyId &&
    form.startDate === DEFAULT_FILTER_FORM.startDate &&
    form.endDate === DEFAULT_FILTER_FORM.endDate
  )
}

/** Filtros aplicados juntos a todos os widgets; só valem depois de "Aplicar filtros". */
export function DashboardFilters({ admin, onApply, collapsible = false }: DashboardFiltersProps) {
  const [form, setForm] = useState<DashboardFilterForm>(DEFAULT_FILTER_FORM)
  const [appliedForm, setAppliedForm] = useState<DashboardFilterForm>(DEFAULT_FILTER_FORM)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const companies = useCompanyOptions(admin)

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

  const update = (field: keyof DashboardFilterForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateFilterForm(form)
    setError(validationError)
    if (!validationError) {
      setAppliedForm(form)
      onApply(form)
      if (collapsible) setOpen(false)
    }
  }

  const handleClear = () => {
    setForm(DEFAULT_FILTER_FORM)
    setAppliedForm(DEFAULT_FILTER_FORM)
    setError(null)
    onApply(DEFAULT_FILTER_FORM)
    if (collapsible) setOpen(false)
  }

  const companyOptions =
    companies.state.status === 'ready'
      ? [ALL_COMPANIES, ...companies.state.companies.map((c) => ({ value: c.id, label: c.name }))]
      : [
          companies.state.status === 'loading'
            ? { value: '', label: 'Carregando empresas...' }
            : ALL_COMPANIES,
        ]

  const formContent = (
    <form
      aria-label="Filtrar dados"
      onSubmit={handleSubmit}
      noValidate
      className={
        collapsible ? 'flex flex-col gap-3' : 'rounded-xl border border-sage-300 bg-white p-3'
      }
    >
      <div
        className={
          collapsible ? 'flex flex-col gap-3' : 'flex flex-col gap-3 lg:flex-row lg:items-center'
        }
      >
        <h2 className="shrink-0 text-sm font-bold text-slate-900">Filtrar dados</h2>
        <div
          className={
            collapsible
              ? 'flex flex-col gap-3'
              : 'grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(13rem,16rem))]'
          }
        >
          {admin && (
            <Select
              label="Empresa"
              labelPlacement="inside"
              value={form.companyId}
              options={companyOptions}
              disabled={companies.state.status !== 'ready'}
              onChange={(event) => update('companyId', event.target.value)}
            />
          )}
          <Select
            label="Período"
            labelPlacement="inside"
            value={form.preset}
            options={PRESET_OPTIONS}
            onChange={(event) => update('preset', event.target.value as PeriodPreset)}
          />
          {form.preset === 'CUSTOM' && (
            <>
              <Input
                label="Data inicial"
                labelPlacement="inside"
                type="date"
                min={MIN_DATE}
                max={MAX_DATE}
                value={form.startDate}
                onChange={(event) => update('startDate', event.target.value)}
              />
              <Input
                label="Data final"
                labelPlacement="inside"
                type="date"
                min={MIN_DATE}
                max={MAX_DATE}
                value={form.endDate}
                onChange={(event) => update('endDate', event.target.value)}
              />
            </>
          )}
        </div>
        <div className={`flex shrink-0 gap-2 ${collapsible ? 'justify-end pt-1' : ''}`}>
          <Button
            type="button"
            variant="tertiary"
            label="Limpar filtros"
            className="!w-auto !px-4 !py-2.5"
            onClick={handleClear}
          />
          <Button
            type="submit"
            variant="neutral"
            label="Aplicar filtros"
            className={collapsible ? '!w-auto !px-4 !py-2.5' : '!w-auto !py-2.5 lg:min-w-56'}
          />
        </div>
      </div>
      {companies.state.status === 'error' && (
        <p className="mt-2 text-sm text-slate-700">
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
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  )

  if (!collapsible) return formContent

  const hasActiveFilter = !isDefaultForm(appliedForm)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Filtrar dados"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-sage-300 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-xs transition-colors hover:border-primary hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <svg
          aria-hidden="true"
          data-testid="dashboard-filter-funnel-icon"
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
        <div className="absolute right-0 top-full z-20 mt-2 w-[min(92vw,360px)] rounded-xl border border-sage-300 bg-white p-4 shadow-lg">
          {formContent}
        </div>
      )}
    </div>
  )
}
