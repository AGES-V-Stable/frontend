import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Beneficiary } from '@/data/mockBeneficiary'
import { getBeneficiaries, getBeneficiary } from '@/services/beneficiary'
import BeneficiaryView from './beneficiaryView'

vi.mock('@/services/beneficiary', () => ({
  getBeneficiaries: vi.fn(),
  getBeneficiary: vi.fn(),
}))

const beneficiary: Beneficiary = {
  id: '1',
  nome: 'Maria Oliveira',
  empresa: 'Cooperativa AgroSul',
  cnpj: '45.123.456/0001-90',
  country: 'Brasil',
  currency: 'BRL',
  status: 'Ativo',
}

const otherBeneficiary: Beneficiary = {
  id: '2',
  nome: 'João Souza',
  empresa: 'TechVale Serviços Ltda.',
  cnpj: '77.888.999/0001-11',
  country: 'Brasil',
  currency: 'BRL',
  status: 'Ativo',
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/beneficiarios']}>
      <BeneficiaryView />
    </MemoryRouter>,
  )

describe('BeneficiaryView', () => {
  beforeEach(() => {
    vi.mocked(getBeneficiaries).mockResolvedValue([beneficiary])
    vi.mocked(getBeneficiary).mockResolvedValue(beneficiary)
  })

  it('loads beneficiaries, applies filters and opens API details', async () => {
    renderPage()

    expect(await screen.findByText('Maria Oliveira')).toBeInTheDocument()
    expect(screen.getByText('45.123.456/0001-90')).toBeInTheDocument()
    expect(screen.getByText('Cooperativa AgroSul')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Buscar por empresa ou CNPJ'), {
      target: { value: 'empresa inexistente' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))
    expect(screen.getByRole('status')).toHaveTextContent('Nenhum beneficiário encontrado')

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Ver detalhes' })).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes' }))

    expect(
      await screen.findByRole('heading', { name: 'Detalhes do beneficiário' }),
    ).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByText('Empresa proprietária')).toBeInTheDocument()
    expect(getBeneficiary).toHaveBeenCalledWith('1')
  })

  it('matches the CNPJ filter against the masked value shown in the table', async () => {
    renderPage()

    await screen.findByText('Maria Oliveira')

    fireEvent.change(screen.getByPlaceholderText('Buscar por empresa ou CNPJ'), {
      target: { value: '0001-90' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(screen.getByText('Maria Oliveira')).toBeInTheDocument()
  })

  it('shows the empty state when the API returns no records', async () => {
    vi.mocked(getBeneficiaries).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('Nenhum beneficiário cadastrado.')).toBeInTheDocument()
  })

  it('shows an error when the list request fails', async () => {
    vi.mocked(getBeneficiaries).mockRejectedValue(new Error('network down'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar')
  })

  it('ignores a stale details response that resolves after a newer request', async () => {
    vi.mocked(getBeneficiaries).mockResolvedValue([beneficiary, otherBeneficiary])
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
