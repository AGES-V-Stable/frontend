import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { mockClients, type Cliente } from '@/data/mockClients'

import AdminClients from './AdminClients'

const renderAdminClients = async (
  loadClients: () => Promise<Cliente[]> = () => Promise.resolve(mockClients),
) => {
  const view = render(
    <MemoryRouter>
      <AdminClients loadClients={loadClients} />
    </MemoryRouter>,
  )
  await screen.findByText(/^· \d+ clientes$/)
  return view
}

describe('AdminClients page', () => {
  it('labels the table and pagination with "clientes"', async () => {
    await renderAdminClients()

    expect(screen.getByText(/^· \d+ clientes$/)).toBeInTheDocument()
    expect(screen.getByText(/de \d+ clientes$/)).toBeInTheDocument()
  })

  it('shows only clients that match the company filter', async () => {
    const user = userEvent.setup()
    await renderAdminClients()

    await user.type(screen.getByPlaceholderText('Buscar por razão social ou CNPJ'), 'BioNorte')
    await user.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(screen.getByText('BioNorte Alimentos S.A.')).toBeInTheDocument()
    expect(screen.queryByText('Cooperativa AgroSul')).not.toBeInTheDocument()
  })

  it('supports status, city and period filters together', async () => {
    const user = userEvent.setup()
    await renderAdminClients()

    await user.selectOptions(screen.getByLabelText('Status'), 'Cadastro recebido')
    await user.selectOptions(screen.getByLabelText('Cidade / UF'), 'Belém / PA')
    await user.selectOptions(screen.getByLabelText('Período de cadastro'), '08/2023')
    await user.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(screen.getByText('BioNorte Alimentos S.A.')).toBeInTheDocument()
    expect(screen.queryByText('TechVale Serviços Ltda.')).not.toBeInTheDocument()
  })

  it('clears applied filters and restores all mock clients', async () => {
    const user = userEvent.setup()
    await renderAdminClients()

    await user.type(screen.getByPlaceholderText('Buscar por razão social ou CNPJ'), 'BioNorte')
    await user.click(screen.getByRole('button', { name: 'Filtrar' }))
    await user.click(screen.getByRole('button', { name: 'Limpar' }))

    expect(screen.getByText('Cooperativa AgroSul')).toBeInTheDocument()
    expect(screen.getByText('TechVale Serviços Ltda.')).toBeInTheDocument()
  })

  it('shows an informative message when no client matches', async () => {
    const user = userEvent.setup()
    await renderAdminClients()

    await user.type(
      screen.getByPlaceholderText('Buscar por razão social ou CNPJ'),
      'cliente inexistente',
    )
    await user.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(screen.getByRole('status')).toHaveTextContent('Nenhum cliente encontrado')
  })

  it('opens a drawer with the selected client details', async () => {
    const user = userEvent.setup()
    await renderAdminClients()

    await user.click(screen.getAllByRole('button', { name: 'Ver detalhes' })[0])

    const dialog = screen.getByRole('dialog')

    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Detalhes do cliente' })).toBeInTheDocument()
    expect(within(dialog).getByText('Cooperativa AgroSul')).toBeInTheDocument()
    expect(within(dialog).getByText('45.123.456/0001-90')).toBeInTheDocument()
    expect(within(dialog).getByText('Carlos Mendonça')).toBeInTheDocument()
  })

  it('shows a loading state and then a genuine empty state (no mock data)', async () => {
    render(
      <MemoryRouter>
        <AdminClients loadClients={() => Promise.resolve([])} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Carregando clientes')
    expect(await screen.findByText('Nenhum cliente cadastrado até o momento.')).toBeInTheDocument()
    expect(screen.queryByText('Cooperativa AgroSul')).not.toBeInTheDocument()
  })

  it('shows an error with a retry action when loading fails', async () => {
    const user = userEvent.setup()
    const loadClients = vi
      .fn<() => Promise<Cliente[]>>()
      .mockRejectedValueOnce(new Error('403'))
      .mockResolvedValueOnce(mockClients)
    render(
      <MemoryRouter>
        <AdminClients loadClients={loadClients} />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os clientes',
    )
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Cooperativa AgroSul')).toBeInTheDocument()
    expect(loadClients).toHaveBeenCalledTimes(2)
  })

  it('paginates the rows instead of rendering every client on every page', async () => {
    const user = userEvent.setup()
    const fiveClients: Cliente[] = [
      ...mockClients,
      { ...mockClients[0]!, id: '5', empresa: 'Quinta Empresa Ltda.' },
    ]
    await renderAdminClients(() => Promise.resolve(fiveClients))

    expect(screen.getByText('Cooperativa AgroSul')).toBeInTheDocument()
    expect(screen.queryByText('Quinta Empresa Ltda.')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Próxima' }))

    expect(screen.getByText('Quinta Empresa Ltda.')).toBeInTheDocument()
    expect(screen.queryByText('Cooperativa AgroSul')).not.toBeInTheDocument()
  })
})
