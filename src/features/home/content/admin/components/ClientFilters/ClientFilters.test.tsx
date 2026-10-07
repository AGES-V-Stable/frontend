import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ClientFilters } from './ClientFilters'

const options = {
  statuses: ['Em auditoria', 'Cadastro recebido'],
  cities: ['Ribeirão Preto / SP', 'Belém / PA'],
  periods: ['08/2023', '10/2023'],
}

describe('ClientFilters', () => {
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
