import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import AdminClients from './AdminClients'

const renderAdminClients = () =>
  render(
    <MemoryRouter>
      <AdminClients />
    </MemoryRouter>,
  )

describe('AdminClients page', () => {
  it('shows only clients that match the company filter', async () => {
    const user = userEvent.setup()
    renderAdminClients()

    await user.type(screen.getByPlaceholderText('Buscar por razão social ou CNPJ'), 'BioNorte')
    await user.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(screen.getByText('BioNorte Alimentos S.A.')).toBeInTheDocument()
    expect(screen.queryByText('Cooperativa AgroSul')).not.toBeInTheDocument()
  })

  it('supports status, city and period filters together', async () => {
    const user = userEvent.setup()
    renderAdminClients()

    await user.selectOptions(screen.getByLabelText('Status'), 'Cadastro recebido')
    await user.selectOptions(screen.getByLabelText('Cidade / UF'), 'Belém / PA')
    await user.selectOptions(screen.getByLabelText('Período de cadastro'), '08/2023')
    await user.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(screen.getByText('BioNorte Alimentos S.A.')).toBeInTheDocument()
    expect(screen.queryByText('TechVale Serviços Ltda.')).not.toBeInTheDocument()
  })

  it('clears applied filters and restores all mock clients', async () => {
    const user = userEvent.setup()
    renderAdminClients()

    await user.type(screen.getByPlaceholderText('Buscar por razão social ou CNPJ'), 'BioNorte')
    await user.click(screen.getByRole('button', { name: 'Filtrar' }))
    await user.click(screen.getByRole('button', { name: 'Limpar' }))

    expect(screen.getByText('Cooperativa AgroSul')).toBeInTheDocument()
    expect(screen.getByText('TechVale Serviços Ltda.')).toBeInTheDocument()
  })

  it('shows an informative message when no client matches', async () => {
    const user = userEvent.setup()
    renderAdminClients()

    await user.type(
      screen.getByPlaceholderText('Buscar por razão social ou CNPJ'),
      'cliente inexistente',
    )
    await user.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(screen.getByRole('status')).toHaveTextContent('Nenhum cliente encontrado')
  })

  it('opens a drawer with the selected client details', async () => {
    const user = userEvent.setup()
    renderAdminClients()

    await user.click(screen.getAllByRole('button', { name: 'Ver detalhes' })[0])

    const dialog = screen.getByRole('dialog')

    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Detalhes do cliente' })).toBeInTheDocument()
    expect(within(dialog).getByText('Cooperativa AgroSul')).toBeInTheDocument()
    expect(within(dialog).getByText('45.123.456/0001-90')).toBeInTheDocument()
    expect(within(dialog).getByText('Carlos Mendonça')).toBeInTheDocument()
  })
})
