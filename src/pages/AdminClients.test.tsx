import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import AdminClients from './AdminClients'

describe('AdminClients page', () => {
  it('shows only clients that match the company filter', () => {
    render(<AdminClients />)

    fireEvent.change(screen.getByPlaceholderText('Buscar por razão social ou CNPJ'), {
      target: { value: 'BioNorte' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(screen.getByText('BioNorte Alimentos S.A.')).toBeInTheDocument()
    expect(screen.queryByText('Cooperativa AgroSul')).not.toBeInTheDocument()
  })

  it('supports status, city and period filters together', () => {
    render(<AdminClients />)

    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'Cadastro recebido' },
    })
    fireEvent.change(screen.getByLabelText('Cidade / UF'), {
      target: { value: 'Belém / PA' },
    })
    fireEvent.change(screen.getByLabelText('Período de cadastro'), {
      target: { value: '08/2023' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(screen.getByText('BioNorte Alimentos S.A.')).toBeInTheDocument()
    expect(screen.queryByText('TechVale Serviços Ltda.')).not.toBeInTheDocument()
  })

  it('clears applied filters and restores all mock clients', () => {
    render(<AdminClients />)

    fireEvent.change(screen.getByPlaceholderText('Buscar por razão social ou CNPJ'), {
      target: { value: 'BioNorte' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))

    expect(screen.getByText('Cooperativa AgroSul')).toBeInTheDocument()
    expect(screen.getByText('TechVale Serviços Ltda.')).toBeInTheDocument()
  })

  it('shows an informative message when no client matches', () => {
    render(<AdminClients />)

    fireEvent.change(screen.getByPlaceholderText('Buscar por razão social ou CNPJ'), {
      target: { value: 'cliente inexistente' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(screen.getByRole('status')).toHaveTextContent('Nenhum cliente encontrado')
  })

  it('opens a drawer with the selected client details', async () => {
    const user = userEvent.setup()
    render(<AdminClients />)

    await user.click(screen.getAllByRole('button', { name: 'Ver detalhes' })[0])

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Detalhes do cliente' })).toBeInTheDocument()
    expect(screen.getByText('Cooperativa AgroSul')).toBeInTheDocument()
    expect(screen.getByText('45.123.456/0001-90')).toBeInTheDocument()
    expect(screen.getByText('Carlos Mendonça')).toBeInTheDocument()
  })
})
