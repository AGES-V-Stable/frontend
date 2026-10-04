import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BeneficiaryFilters } from './BeneficiaryFilters'

const options = {
  countries: ['Brasil', 'Estados Unidos'],
  currencies: ['BRL', 'USD'],
  statuses: ['Ativo', 'Pendente'],
}

describe('BeneficiaryFilters', () => {
  it('submits all beneficiary filters when company filter is visible', () => {
    const onApply = vi.fn()

    render(<BeneficiaryFilters {...options} onApply={onApply} onClear={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Buscar por empresa ou CNPJ'), {
      target: { value: 'V-Stable' },
    })
    fireEvent.change(screen.getByPlaceholderText('Buscar beneficiário'), {
      target: { value: 'Maria' },
    })
    fireEvent.change(screen.getByLabelText('País'), { target: { value: 'Brasil' } })
    fireEvent.change(screen.getByLabelText('Moeda'), { target: { value: 'BRL' } })
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Ativo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(onApply).toHaveBeenCalledWith({
      companyOrCnpj: 'V-Stable',
      search: 'Maria',
      country: 'Brasil',
      currency: 'BRL',
      status: 'Ativo',
    })
  })

  it('submits filters correctly when company filter is hidden', () => {
    const onApply = vi.fn()

    render(<BeneficiaryFilters {...options} hideCompanyFilter onApply={onApply} onClear={vi.fn()} />)

    expect(screen.queryByPlaceholderText('Buscar por empresa ou CNPJ')).not.toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Buscar beneficiário'), {
      target: { value: 'Maria' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(onApply).toHaveBeenCalledWith({
      companyOrCnpj: '',
      search: 'Maria',
      country: '',
      currency: '',
      status: '',
    })
  })

  it('clears all fields and notifies the page', () => {
    const onClear = vi.fn()

    render(<BeneficiaryFilters {...options} onApply={vi.fn()} onClear={onClear} />)

    const companyOrCnpj = screen.getByPlaceholderText('Buscar por empresa ou CNPJ')
    fireEvent.change(companyOrCnpj, { target: { value: 'Empresa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))

    expect(onClear).toHaveBeenCalledOnce()
    expect(companyOrCnpj).toHaveValue('')
    expect(screen.getByPlaceholderText('Buscar beneficiário')).toHaveValue('')
    expect(screen.getByLabelText('País')).toHaveValue('')
    expect(screen.getByLabelText('Moeda')).toHaveValue('')
    expect(screen.getByLabelText('Status')).toHaveValue('')
  })
})