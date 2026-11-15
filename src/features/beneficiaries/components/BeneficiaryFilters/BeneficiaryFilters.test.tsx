import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BeneficiaryFilters } from '@/features/beneficiaries/components/BeneficiaryFilters/BeneficiaryFilters'

const options = {
  countries: ['Brasil', 'Estados Unidos'],
  currencies: ['BRL', 'USD'],
  statuses: ['Ativo', 'Pendente'],
}

describe('BeneficiaryFilters', () => {
  it('uses the same field style as the shared inputs: surface background and 8px corners', () => {
    // Given os filtros de beneficiários
    render(<BeneficiaryFilters {...options} onApply={vi.fn()} onClear={vi.fn()} />)

    // Then a busca e o país usam o fundo cinza claro dos campos, e não o branco
    for (const field of [
      screen.getByPlaceholderText('Buscar por empresa ou CNPJ'),
      screen.getByPlaceholderText('Buscar beneficiário'),
      screen.getByLabelText('País'),
    ]) {
      expect(field).toHaveClass('bg-surface', 'rounded-lg', 'border-sage-500')
      expect(field).not.toHaveClass('bg-white')
    }
  })

  it('submits all beneficiary filters', () => {
    const onApply = vi.fn()

    render(<BeneficiaryFilters {...options} onApply={onApply} onClear={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Buscar por empresa ou CNPJ'), {
      target: { value: 'V-Stable' },
    })
    fireEvent.change(screen.getByPlaceholderText('Buscar beneficiário'), {
      target: { value: 'Maria' },
    })
    fireEvent.change(screen.getByLabelText('País'), { target: { value: 'Brasil' } })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(onApply).toHaveBeenCalledWith({
      companyOrCnpj: 'V-Stable',
      search: 'Maria',
      country: 'Brasil',
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
  })
})
