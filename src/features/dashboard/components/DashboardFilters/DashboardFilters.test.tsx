import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getCompanyOptions } from '@/features/dashboard/api/companies'
import { DashboardFilters } from '@/features/dashboard/components/DashboardFilters'
import { DEFAULT_FILTER_FORM } from '@/features/dashboard/utils/period'

vi.mock('@/features/dashboard/api/companies', () => ({ getCompanyOptions: vi.fn() }))

const getCompaniesMock = vi.mocked(getCompanyOptions)

describe('DashboardFilters', () => {
  beforeEach(() => {
    getCompaniesMock.mockReset()
    getCompaniesMock.mockResolvedValue([
      { id: 'a', name: 'Alfa' },
      { id: 'b', name: 'Beta' },
    ])
  })

  it('starts on the last six months and applies only on submit', () => {
    const onApply = vi.fn()
    render(<DashboardFilters admin={false} onApply={onApply} />)

    expect(screen.getByLabelText('Período')).toHaveValue('SIX_MONTHS')
    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'THIS_MONTH' } })
    expect(onApply).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    expect(onApply).toHaveBeenCalledWith({ ...DEFAULT_FILTER_FORM, preset: 'THIS_MONTH' })
  })

  it('shows the custom dates and blocks a start date after the end date', () => {
    const onApply = vi.fn()
    render(<DashboardFilters admin={false} onApply={onApply} />)

    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'CUSTOM' } })
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-02-01' } })
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A data inicial não pode ser posterior à data final.',
    )
    expect(onApply).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-03-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onApply).toHaveBeenCalledWith({
      ...DEFAULT_FILTER_FORM,
      preset: 'CUSTOM',
      startDate: '2026-02-01',
      endDate: '2026-03-01',
    })
  })

  it('clears back to the default filters and applies them', () => {
    const onApply = vi.fn()
    render(<DashboardFilters admin={false} onApply={onApply} />)
    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'CUSTOM' } })
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-02-01' } })
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    expect(screen.getByLabelText('Período')).toHaveValue('SIX_MONTHS')
    expect(screen.queryByLabelText('Data inicial')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onApply).toHaveBeenLastCalledWith(DEFAULT_FILTER_FORM)
  })

  it('has no company filter for the client and does not load companies', () => {
    render(<DashboardFilters admin={false} onApply={vi.fn()} />)

    expect(screen.queryByLabelText('Empresa')).not.toBeInTheDocument()
    expect(getCompaniesMock).not.toHaveBeenCalled()
  })

  it('lets the administrator choose a company or all of them', async () => {
    const onApply = vi.fn()
    render(<DashboardFilters admin onApply={onApply} />)

    const company = screen.getByLabelText('Empresa')
    expect(company).toBeDisabled()
    await waitFor(() => expect(company).toBeEnabled())
    expect(screen.getAllByRole('option', { name: /Alfa|Beta|Todas as empresas/ })).toHaveLength(3)
    expect(company).toHaveValue('')

    fireEvent.change(company, { target: { value: 'b' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    expect(onApply).toHaveBeenCalledWith({ ...DEFAULT_FILTER_FORM, companyId: 'b' })
  })

  it('keeps the consolidated view and offers a retry when companies fail to load', async () => {
    getCompaniesMock.mockReset()
    getCompaniesMock.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([])
    render(<DashboardFilters admin onApply={vi.fn()} />)

    expect(await screen.findByText(/Não foi possível carregar as empresas/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    await waitFor(() => expect(screen.getByLabelText('Empresa')).toBeEnabled())
    expect(getCompaniesMock).toHaveBeenCalledTimes(2)
  })
})
