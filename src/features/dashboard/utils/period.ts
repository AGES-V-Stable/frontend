import type {
  DashboardFilterForm,
  DashboardFilters,
  PeriodPreset,
} from '@/features/dashboard/types/dashboardFilters'

/** Limites aceitos pelo backend para as datas do dashboard. */
export const MIN_DATE = '2000-01-01'
export const MAX_DATE = '2100-12-31'

export const PRESET_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: 'THIS_MONTH', label: 'Este mês' },
  { value: 'SIX_MONTHS', label: 'Últimos 6 meses' },
  { value: 'TWELVE_MONTHS', label: 'Últimos 12 meses' },
  { value: 'ALL', label: 'Desde o início' },
  { value: 'CUSTOM', label: 'Personalizado' },
]

export const DEFAULT_FILTER_FORM: DashboardFilterForm = {
  preset: 'SIX_MONTHS',
  startDate: '',
  endDate: '',
  companyId: '',
}

/** Data de hoje em America/Sao_Paulo, no formato "AAAA-MM-DD". */
export function todayInSaoPaulo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now)
}

/** Primeiro dia do mês `monthsBack` meses antes do mês de `today`. */
function firstDayMonthsBack(today: string, monthsBack: number): string {
  const [year, month] = today.split('-').map(Number)
  const index = year * 12 + (month - 1) - monthsBack
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}-01`
}

/** Mensagem de erro do formulário, ou null quando o período pode ser aplicado. */
export function validateFilterForm(form: DashboardFilterForm): string | null {
  if (form.preset !== 'CUSTOM') return null
  const outOfRange = [form.startDate, form.endDate].some(
    (date) => date !== '' && (date < MIN_DATE || date > MAX_DATE),
  )
  if (outOfRange) return 'Informe datas entre 01/01/2000 e 31/12/2100.'
  if (form.startDate && form.endDate && form.startDate > form.endDate) {
    return 'A data inicial não pode ser posterior à data final.'
  }
  return null
}

/** Converte o formulário no período enviado aos endpoints; `today` vem de {@link todayInSaoPaulo}. */
export function toDashboardFilters(
  form: DashboardFilterForm,
  today: string,
  admin: boolean,
): DashboardFilters {
  const companyId = admin && form.companyId ? form.companyId : undefined
  const period = (startDate?: string, endDate?: string) => ({
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(companyId ? { companyId } : {}),
  })
  switch (form.preset) {
    case 'THIS_MONTH':
      return period(firstDayMonthsBack(today, 0), today)
    case 'SIX_MONTHS':
      return period(firstDayMonthsBack(today, 5), today)
    case 'TWELVE_MONTHS':
      return period(firstDayMonthsBack(today, 11), today)
    case 'ALL':
      return period(undefined, today)
    case 'CUSTOM':
      return period(form.startDate || undefined, form.endDate || undefined)
  }
}

const displayDate = (date: string) => date.split('-').reverse().join('/')

/** Descrição curta do período aplicado, para os cards que acompanham o filtro. */
export function describePeriod({ startDate, endDate }: DashboardFilters): string {
  if (startDate && endDate) return `${displayDate(startDate)} a ${displayDate(endDate)}`
  if (startDate) return `Desde ${displayDate(startDate)}`
  if (endDate) return `Até ${displayDate(endDate)}`
  return 'Todo o histórico'
}

/** Parâmetros de consulta do período e da empresa, na ordem do backend. */
export function filtersQuery(filters: DashboardFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.companyId) params.set('companyId', filters.companyId)
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)
  return params
}
