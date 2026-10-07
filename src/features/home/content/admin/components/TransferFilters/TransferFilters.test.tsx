import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TransferFilters } from './TransferFilters'

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
})
