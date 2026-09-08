import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ClientFilters } from './ClientFilters'

const options = {
  statuses: ['Em auditoria', 'Cadastro recebido'],
  cities: ['Ribeirão Preto / SP', 'Belém / PA'],
  periods: ['08/2023', '10/2023'],
}

describe('ClientFilters', () => {
  it('submits the selected filters', () => {
    const onApply = vi.fn()

    render(<ClientFilters {...options} onApply={onApply} onClear={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Buscar por razão social ou CNPJ'), {
      target: { value: 'AgroSul' },
    })
    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'Em auditoria' },
    })
    fireEvent.change(screen.getByLabelText('Cidade / UF'), {
      target: { value: 'Ribeirão Preto / SP' },
    })
    fireEvent.change(screen.getByLabelText('Período de cadastro'), {
      target: { value: '08/2023' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(onApply).toHaveBeenCalledWith({
      search: 'AgroSul',
      status: 'Em auditoria',
      city: 'Ribeirão Preto / SP',
      period: '08/2023',
    })
  })

  it('clears the fields and notifies the page', () => {
    const onClear = vi.fn()

    render(<ClientFilters {...options} onApply={vi.fn()} onClear={onClear} />)

    const search = screen.getByPlaceholderText('Buscar por razão social ou CNPJ')
    fireEvent.change(search, { target: { value: 'empresa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))

    expect(onClear).toHaveBeenCalledOnce()
    expect(search).toHaveValue('')
  })
})
