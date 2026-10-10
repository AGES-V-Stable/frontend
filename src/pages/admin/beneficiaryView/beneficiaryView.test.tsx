import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Beneficiary, PaginatedBeneficiaries } from '@/types/beneficiary'
import { getBeneficiaries, getBeneficiary } from '@/services/beneficiary'
import BeneficiaryView from './beneficiaryView'

vi.mock('@/services/beneficiary', () => ({
  getBeneficiaries: vi.fn(),
  getBeneficiary: vi.fn(),
}))

const beneficiary: Beneficiary = {
  id: '1',
  companyId: 'company-1',
  nickname: 'Maria Oliveira',
  identificationDocument: '45123456000190',
  country: 'Brasil',
  address: 'Rua das Flores, 123',
  legalName: 'Maria Oliveira Silva',
  receivingMethod: 'BANK_ACCOUNT',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
}

const otherBeneficiary: Beneficiary = {
  id: '2',
  companyId: 'company-1',
  nickname: 'João Souza',
  identificationDocument: '77888999000111',
  country: 'Brasil',
  address: 'Av. Paulista, 1000',
  legalName: 'João Souza Ltda',
  receivingMethod: 'PIX_KEY',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
}

const paginatedResponse = (items: Beneficiary[]): PaginatedBeneficiaries => ({
  content: items,
  totalElements: items.length,
  totalPages: 1,
  number: 0,
  size: 10,
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/beneficiarios']}>
      <BeneficiaryView />
    </MemoryRouter>,
  )

describe('BeneficiaryView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getBeneficiaries).mockResolvedValue(paginatedResponse([beneficiary]))
    vi.mocked(getBeneficiary).mockResolvedValue(beneficiary)
  })

  it('loads beneficiaries, applies filters via API and opens API details', async () => {
    renderPage()

    expect(await screen.findByText('Maria Oliveira')).toBeInTheDocument()
    expect(screen.getByText('45.123.456/0001-90')).toBeInTheDocument()

    vi.mocked(getBeneficiaries).mockResolvedValueOnce(paginatedResponse([]))
    fireEvent.change(screen.getByPlaceholderText('Buscar por empresa ou CNPJ'), {
      target: { value: 'empresa inexistente' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(getBeneficiaries).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'empresa inexistente',
      }),
    )
    expect(await screen.findByText('Nenhum beneficiário encontrado.')).toBeInTheDocument()

    vi.mocked(getBeneficiaries).mockResolvedValueOnce(paginatedResponse([beneficiary]))
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Ver detalhes' })).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes' }))

    expect(
      await screen.findByRole('heading', { name: 'Detalhes do beneficiário' }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('dialog')).getByText('ID da Empresa Proprietária'),
    ).toBeInTheDocument()
    expect(getBeneficiary).toHaveBeenCalledWith('1')
  })

  it('sends document filter correctly for numeric strings', async () => {
    renderPage()
    await screen.findByText('Maria Oliveira')

    fireEvent.change(screen.getByPlaceholderText('Buscar por empresa ou CNPJ'), {
      target: { value: '45.123.456/0001-90' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(getBeneficiaries).toHaveBeenCalledWith(
      expect.objectContaining({
        document: '45123456000190',
      }),
    )
  })

  it('shows the empty state when the API returns no records', async () => {
    vi.mocked(getBeneficiaries).mockResolvedValue(paginatedResponse([]))
    renderPage()

    expect(await screen.findByText('Nenhum beneficiário encontrado.')).toBeInTheDocument()
  })

  it('shows an error when the list request fails', async () => {
    vi.mocked(getBeneficiaries).mockRejectedValue(new Error('network down'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar')
  })

  it('ignores a stale details response that resolves after a newer request', async () => {
    vi.mocked(getBeneficiaries).mockResolvedValue(
      paginatedResponse([beneficiary, otherBeneficiary]),
    )
    let resolveFirst!: (value: Beneficiary) => void
    vi.mocked(getBeneficiary).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve
        }),
    )
    vi.mocked(getBeneficiary).mockImplementationOnce(async () => otherBeneficiary)
    renderPage()

    const detailButtons = await screen.findAllByRole('button', { name: 'Ver detalhes' })
    fireEvent.click(detailButtons[0])
    fireEvent.click(detailButtons[1])

    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(within(dialog).getByText('João Souza')).toBeInTheDocument())

    await act(async () => {
      resolveFirst(beneficiary)
      await Promise.resolve()
    })

    expect(within(dialog).getByText('João Souza')).toBeInTheDocument()
    expect(within(dialog).queryByText('Maria Oliveira')).not.toBeInTheDocument()
  })

  it('opens and closes the details drawer using only the keyboard', async () => {
    const user = userEvent.setup()
    renderPage()

    const detailsButton = await screen.findByRole('button', { name: 'Ver detalhes' })
    detailsButton.focus()
    await user.keyboard('{Enter}')

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()

    const closeButton = within(dialog).getByRole('button', { name: 'Fechar' })
    closeButton.focus()
    await user.keyboard('{Enter}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows an error when details cannot be loaded', async () => {
    vi.mocked(getBeneficiary).mockRejectedValue(new Error('details unavailable'))
    renderPage()
    await screen.findByText('Maria Oliveira')

    fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os detalhes',
    )
  })
})
