import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ClientFilters } from '@/features/clients/components/ClientFilters/ClientFilters'

const options = {
  statuses: ['Em auditoria', 'Cadastro recebido'],
  cities: ['Ribeirão Preto / SP', 'Belém / PA'],
  periods: ['08/2023', '10/2023'],
}

describe('ClientFilters', () => {
  it('uses the shared Input and Select, with the surface background and the inset chevron', () => {
    // Given os filtros de clientes PME
    render(<ClientFilters {...options} onApply={vi.fn()} onClear={vi.fn()} />)

    // Then a busca e os três selects usam o estilo padrão dos campos, na altura dos botões
    const fields = [
      screen.getByLabelText('Empresa ou CNPJ'),
      screen.getByLabelText('Status'),
      screen.getByLabelText('Cidade / UF'),
      screen.getByLabelText('Período de cadastro'),
    ]
    for (const field of fields) {
      expect(field).toHaveClass('bg-surface', 'rounded-lg', 'border-sage-500', 'h-11')
      expect(field).not.toHaveClass('bg-white')
    }
    // And cada select tem a seta própria do componente
    expect(screen.getAllByTestId('select-chevron')).toHaveLength(3)
  })

  it('submits the selected filters', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()

    render(<ClientFilters {...options} onApply={onApply} onClear={vi.fn()} />)

    await user.type(screen.getByPlaceholderText('Buscar por razão social ou CNPJ'), 'AgroSul')
    await user.selectOptions(screen.getByLabelText('Status'), 'Em auditoria')
    await user.selectOptions(screen.getByLabelText('Cidade / UF'), 'Ribeirão Preto / SP')
    await user.selectOptions(screen.getByLabelText('Período de cadastro'), '08/2023')
    await user.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(onApply).toHaveBeenCalledWith({
      search: 'AgroSul',
      status: 'Em auditoria',
      city: 'Ribeirão Preto / SP',
      period: '08/2023',
    })
  })

  it('clears the fields and notifies the page', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()

    render(<ClientFilters {...options} onApply={vi.fn()} onClear={onClear} />)

    const search = screen.getByPlaceholderText('Buscar por razão social ou CNPJ')
    await user.type(search, 'empresa')
    await user.click(screen.getByRole('button', { name: 'Limpar' }))

    expect(onClear).toHaveBeenCalledOnce()
    expect(search).toHaveValue('')
  })
})
