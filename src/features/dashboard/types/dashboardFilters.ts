/**
 * Filtros aplicados a todos os widgets do dashboard. Datas em "AAAA-MM-DD" (fuso America/Sao_Paulo,
 * fim inclusivo); ausência não limita o período. `companyId` só existe na visão administrativa.
 */
export interface DashboardFilters {
  startDate?: string
  endDate?: string
  companyId?: string
}

export type PeriodPreset = 'THIS_MONTH' | 'SIX_MONTHS' | 'TWELVE_MONTHS' | 'ALL' | 'CUSTOM'

/** Valores do formulário de filtros, antes de virar o período aplicado. */
export interface DashboardFilterForm {
  preset: PeriodPreset
  startDate: string
  endDate: string
  companyId: string
}
