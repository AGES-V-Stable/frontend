import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TransferFilters } from '@/features/transfers/components/TransferFilters/TransferFilters'

const options = {
  statuses: ['Concluída', 'Processando', 'Falha'],
  types: ['Pagamento', 'Recebimento'],
}

describe('TransferFilters', () => {
  it('submits the selected filters', () => {
    const onApply = vi.fn()

    render(<TransferFilters {...options} onApply={onApply} onClear={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Buscar por empresa ou CNPJ'), {
      target: { value: 'Tech Corp' },
    })
    fireEvent.change(screen.getByPlaceholderText('Buscar por beneficiário'), {
      target: { value: 'Atlas' },
    })
    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'Concluída' },
    })
    fireEvent.change(screen.getByLabelText('Tipo'), {
      target: { value: 'Pagamento' },
    })
    fireEvent.change(screen.getByLabelText('Data inicial'), {
      target: { value: '2026-08-01' },
    })
    fireEvent.change(screen.getByLabelText('Data final'), {
      target: { value: '2026-08-31' },
    })
    fireEvent.change(screen.getByLabelText('Valor mínimo'), {
      target: { value: '100' },
    })
    fireEvent.change(screen.getByLabelText('Valor máximo'), {
      target: { value: '5000' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(onApply).toHaveBeenCalledWith({
      search: 'Tech Corp',
      beneficiary: 'Atlas',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      minAmount: '100',
      maxAmount: '5000',
      status: 'Concluída',
      type: 'Pagamento',
    })
  })

  it('clears the fields and notifies the page', () => {
    const onClear = vi.fn()

    render(<TransferFilters {...options} onApply={vi.fn()} onClear={onClear} />)

    const search = screen.getByPlaceholderText('Buscar por empresa ou CNPJ')
    fireEvent.change(search, { target: { value: 'empresa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))

    expect(onClear).toHaveBeenCalledOnce()
    expect(search).toHaveValue('')
  })

  it('blocks submit when start date is after end date', () => {
    const onApply = vi.fn()

    render(<TransferFilters {...options} onApply={onApply} onClear={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Data inicial'), {
      target: { value: '2026-08-31' },
    })
    fireEvent.change(screen.getByLabelText('Data final'), {
      target: { value: '2026-08-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(onApply).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A data inicial não pode ser posterior à data final.',
    )
  })

  it('blocks submit when minimum amount is negative', () => {
    const onApply = vi.fn()

    render(<TransferFilters {...options} onApply={onApply} onClear={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Valor mínimo'), {
      target: { value: '-10' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(onApply).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('O valor mínimo não pode ser negativo.')
  })

  it('blocks submit when minimum amount is greater than maximum amount', () => {
    const onApply = vi.fn()

    render(<TransferFilters {...options} onApply={onApply} onClear={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Valor mínimo'), {
      target: { value: '5000' },
    })
    fireEvent.change(screen.getByLabelText('Valor máximo'), {
      target: { value: '100' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(onApply).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'O valor mínimo não pode ser maior que o valor máximo.',
    )
  })

  it('keeps the search bar fixed outside and opens secondary filters in a popover when collapsible', () => {
    const onApply = vi.fn()

    render(<TransferFilters {...options} collapsible onApply={onApply} onClear={vi.fn()} />)

    const trigger = screen.getByRole('button', { name: 'Filtrar transferências' })
    expect(screen.getByTestId('transfer-search-icon')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Buscar transferência')).toBeInTheDocument()
    expect(screen.getByTestId('transfer-filter-funnel-icon')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Filtrar' })).not.toBeInTheDocument()

    fireEvent.click(trigger)
    fireEvent.change(screen.getByLabelText('Valor mínimo'), { target: { value: '150000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ minAmount: '150000' }))
    expect(screen.queryByRole('button', { name: 'Filtrar' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Filtros ativos')).toBeInTheDocument()
  })

  it('filters and selects a beneficiary from the searchable dropdown', () => {
    const onApply = vi.fn()

    render(
      <TransferFilters
        {...options}
        beneficiaries={['Atlas Imports LLC', 'Global Tech Corp']}
        onApply={onApply}
        onClear={vi.fn()}
      />,
    )

    const input = screen.getByLabelText('Beneficiário')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Atlas' } })

    expect(screen.getByRole('option', { name: 'Atlas Imports LLC' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Global Tech Corp' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('option', { name: 'Atlas Imports LLC' }))
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ beneficiary: 'Atlas Imports LLC' }),
    )
  })
})
