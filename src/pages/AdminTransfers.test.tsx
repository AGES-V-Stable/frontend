import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import AdminTransfers from './AdminTransfers'
import { getTransfers } from '@/services/transfers'
import { mockTransfers } from '@/data/mockTransfers'

vi.mock('@/services/transfers', () => ({
  getTransfers: vi.fn(),
}))

const renderAdminTransfers = () =>
  render(
    <MemoryRouter>
      <AdminTransfers />
    </MemoryRouter>,
  )

describe('AdminTransfers page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    vi.mocked(getTransfers).mockReturnValue(new Promise(() => {}))
    renderAdminTransfers()
    
    expect(screen.getByText('Carregando transferências...')).toBeInTheDocument()
  })

  it('renders table with 7 columns including Empresa and formatting', async () => {
    vi.mocked(getTransfers).mockResolvedValue({
      data: mockTransfers.slice(0, 3),
      totalItems: 6,
      totalPages: 2,
      currentPage: 1,
    })

    renderAdminTransfers()

    await waitFor(() => {
      expect(screen.getByText('Atlas Imports LLC')).toBeInTheDocument()
    })

    // Assert headers
    const headers = screen.getAllByRole('columnheader')
    expect(headers).toHaveLength(7)
    expect(headers[0]).toHaveTextContent('Empresa')
    expect(headers[1]).toHaveTextContent('Beneficiário')
    expect(headers[2]).toHaveTextContent('Data')
    expect(headers[3]).toHaveTextContent('Tipo')
    expect(headers[4]).toHaveTextContent('Valor')
    expect(headers[5]).toHaveTextContent('Status')
    expect(headers[6]).toHaveTextContent('Ação')

    
    expect(screen.getByText('24 ago 2026')).toBeInTheDocument()
    
    const currencyCells = screen.getAllByRole('cell', { name: /USD\s23\.062,73/i })
    expect(currencyCells.length).toBeGreaterThan(0)
  })

  it('handles empty state', async () => {
    vi.mocked(getTransfers).mockResolvedValue({
      data: [],
      totalItems: 0,
      totalPages: 1,
      currentPage: 1,
    })

    renderAdminTransfers()

    await waitFor(() => {
      expect(screen.getByText('Nenhuma transferência encontrada.')).toBeInTheDocument()
    })
  })

  it('handles error state and allows retry', async () => {
    const user = userEvent.setup()
    
    // First call fails
    vi.mocked(getTransfers).mockRejectedValueOnce(new Error('Network error'))
    
    // Second call succeeds
    vi.mocked(getTransfers).mockResolvedValueOnce({
      data: mockTransfers.slice(0, 1),
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
    })

    renderAdminTransfers()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Não foi possível carregar as transferências. Tente novamente.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    await waitFor(() => {
      expect(screen.getByText('Atlas Imports LLC')).toBeInTheDocument()
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('supports pagination and disables previous on first page', async () => {
    const user = userEvent.setup()

    vi.mocked(getTransfers).mockResolvedValueOnce({
      data: mockTransfers.slice(0, 3),
      totalItems: 6,
      totalPages: 2,
      currentPage: 1,
    })

    renderAdminTransfers()

    await waitFor(() => {
      expect(screen.getByText('Atlas Imports LLC')).toBeInTheDocument()
    })

    const prevButton = screen.getByRole('button', { name: /anterior/i })
    const nextButton = screen.getByRole('button', { name: /próxima/i })

    
    expect(prevButton).toBeDisabled()
    expect(nextButton).not.toBeDisabled()
    
    expect(screen.getByText(/1 de 2/i)).toBeInTheDocument()

    
    vi.mocked(getTransfers).mockResolvedValueOnce({
      data: mockTransfers.slice(3, 6),
      totalItems: 6,
      totalPages: 2,
      currentPage: 2,
    })

    await user.click(nextButton)

    await waitFor(() => {
      expect(getTransfers).toHaveBeenCalledWith(2, 6)
      expect(screen.getByText(/2 de 2/i)).toBeInTheDocument()
    })

    
    expect(screen.getByRole('button', { name: /anterior/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /próxima/i })).toBeDisabled()
  })

  it('opens drawer on "Ver detalhes" click with accessible label', async () => {
    const user = userEvent.setup()
    vi.mocked(getTransfers).mockResolvedValue({
      data: mockTransfers.slice(0, 1),
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
    })

    renderAdminTransfers()

    await waitFor(() => {
      expect(screen.getByText('Atlas Imports LLC')).toBeInTheDocument()
    })

    const detailButtons = screen.getAllByRole('button', { name: 'Ver detalhes' })
    expect(detailButtons.length).toBeGreaterThan(0)
    
    await user.click(detailButtons[0])

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Detalhes da transferência' })).toBeInTheDocument()
    
    // Check if correct data is inside drawer
    expect(within(dialog).getByText('Tech Corp')).toBeInTheDocument()
    expect(within(dialog).getByText('t1')).toBeInTheDocument()
  })
})

