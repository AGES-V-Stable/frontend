import { describe, expect, it } from 'vitest'

import {
  DEFAULT_FILTER_FORM,
  describePeriod,
  filtersQuery,
  toDashboardFilters,
  todayInSaoPaulo,
  validateFilterForm,
} from '@/features/dashboard/utils/period'

describe('todayInSaoPaulo', () => {
  it('uses the São Paulo calendar day, not the UTC one', () => {
    expect(todayInSaoPaulo(new Date('2026-11-01T02:30:00Z'))).toBe('2026-10-31')
    expect(todayInSaoPaulo(new Date('2026-11-01T03:30:00Z'))).toBe('2026-11-01')
  })
})

describe('toDashboardFilters', () => {
  const today = '2026-11-03'

  it.each([
    ['THIS_MONTH', '2026-11-01'],
    ['SIX_MONTHS', '2026-06-01'],
    ['TWELVE_MONTHS', '2025-12-01'],
  ] as const)('starts %s on the first day of the month and ends today', (preset, startDate) => {
    expect(toDashboardFilters({ ...DEFAULT_FILTER_FORM, preset }, today, false)).toEqual({
      startDate,
      endDate: today,
    })
  })

  it('crosses the year boundary for the default six months', () => {
    expect(toDashboardFilters(DEFAULT_FILTER_FORM, '2026-02-15', false)).toEqual({
      startDate: '2025-09-01',
      endDate: '2026-02-15',
    })
  })

  it('has no start date since the beginning', () => {
    expect(toDashboardFilters({ ...DEFAULT_FILTER_FORM, preset: 'ALL' }, today, false)).toEqual({
      endDate: today,
    })
  })

  it('keeps the custom dates, including a single one', () => {
    const form = { ...DEFAULT_FILTER_FORM, preset: 'CUSTOM' as const, startDate: '2026-01-10' }
    expect(toDashboardFilters(form, today, false)).toEqual({ startDate: '2026-01-10' })
  })

  it('sends the company only for the administrator', () => {
    const form = { ...DEFAULT_FILTER_FORM, companyId: 'c1' }
    expect(toDashboardFilters(form, today, true).companyId).toBe('c1')
    expect(toDashboardFilters(form, today, false).companyId).toBeUndefined()
  })
})

describe('validateFilterForm', () => {
  const custom = { ...DEFAULT_FILTER_FORM, preset: 'CUSTOM' as const }

  it('rejects a start date after the end date', () => {
    expect(validateFilterForm({ ...custom, startDate: '2026-02-01', endDate: '2026-01-01' })).toBe(
      'A data inicial não pode ser posterior à data final.',
    )
  })

  it('rejects dates outside the range accepted by the backend', () => {
    expect(validateFilterForm({ ...custom, startDate: '1999-12-31' })).toBe(
      'Informe datas entre 01/01/2000 e 31/12/2100.',
    )
  })

  it('accepts equal dates, open ranges and every preset', () => {
    expect(validateFilterForm({ ...custom, startDate: '2026-01-01', endDate: '2026-01-01' })).toBe(
      null,
    )
    expect(validateFilterForm({ ...custom, endDate: '2026-01-01' })).toBeNull()
    expect(validateFilterForm(DEFAULT_FILTER_FORM)).toBeNull()
  })
})

describe('describePeriod and filtersQuery', () => {
  it('describes the applied period in Brazilian format', () => {
    expect(describePeriod({ startDate: '2026-06-01', endDate: '2026-11-03' })).toBe(
      '01/06/2026 a 03/11/2026',
    )
    expect(describePeriod({ endDate: '2026-11-03' })).toBe('Até 03/11/2026')
    expect(describePeriod({ startDate: '2026-06-01' })).toBe('Desde 01/06/2026')
    expect(describePeriod({})).toBe('Todo o histórico')
  })

  it('builds the query only with the present values', () => {
    expect(filtersQuery({ startDate: '2026-06-01', endDate: '2026-11-03' }).toString()).toBe(
      'startDate=2026-06-01&endDate=2026-11-03',
    )
    expect(filtersQuery({ companyId: 'c1' }).toString()).toBe('companyId=c1')
    expect(filtersQuery({}).toString()).toBe('')
  })
})
