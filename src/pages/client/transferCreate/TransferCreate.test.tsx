import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCompanyBeneficiaries } from '@/services/beneficiary'
import { HttpError } from '@/services/httpClient'
import { createTransfer, getTransferQuote } from '@/services/transfers'
import { getCurrentUser } from '@/services/user'
import type { Beneficiary } from '@/types/beneficiary'
import type { TransferQuoteResponse } from '@/types/transfer'

import { TransferCreate } from './TransferCreate'

vi.mock('@/services/transfers', () => ({
  getTransferQuote: vi.fn(),
  createTransfer: vi.fn(),
}))
vi.mock('@/services/beneficiary', () => ({ getCompanyBeneficiaries: vi.fn() }))
vi.mock('@/services/user', () => ({ getCurrentUser: vi.fn() }))

const DEBOUNCE_MS = 500

const atlas: Beneficiary = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  companyId: 'c1',
  nickname: 'Atlas',
  legalName: 'Atlas Imports LLC',
  currency: 'USD',
  receivingMethod: 'BANK_ACCOUNT',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const euroSupplier: Beneficiary = {
  ...atlas,
  id: '6fa459ea-ee8a-4ca4-894e-db77e160355e',
  nickname: 'Rhein',
  legalName: 'Rhein Handel GmbH',
  currency: 'EUR',
}

const quote: TransferQuoteResponse = {
  source: { amount: 125000, currency: 'BRL' },
  destination: { amount: 24235.14, currency: 'USD' },
  exchangeRate: { fromCurrency: 'USD', toCurrency: 'BRL', rate: 5.16 },
  fee: { percentage: 0.45, amount: 562.5, currency: 'BRL' },
  total: { amount: 125562.5, currency: 'BRL' },
}

const httpError = (status: number, message: string) =>
  new HttpError(`failed with ${status}`, status, JSON.stringify({ message }))

// Deixa as promessas pendentes (serviços mockados) resolverem e avança o relógio falso.
const advance = (ms = 0) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

const sourceInput = () => screen.getByLabelText('Valor de origem (BRL) *')
const destinationInput = () => screen.getByLabelText(/Valor de destino/)
const beneficiarySelect = () => screen.getByLabelText('Beneficiário *')
const continueButton = () => screen.getByRole('button', { name: 'Continuar' })

const renderPage = async () => {
  render(<TransferCreate />)
  await advance()
}

const typeSourceAmount = async (text: string) => {
  fireEvent.change(sourceInput(), { target: { value: text } })
  await advance(DEBOUNCE_MS)
}

describe('TransferCreate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1',
      name: 'Marina Costa',
      email: 'marina@example.com',
      companyId: 'c1',
    })
    vi.mocked(getCompanyBeneficiaries).mockResolvedValue({
      content: [atlas, euroSupplier],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 100,
    })
    vi.mocked(getTransferQuote).mockResolvedValue(quote)
    vi.mocked(createTransfer).mockResolvedValue({ status: 'PROCESSING' })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('starts without a quote, with Continuar disabled and the company beneficiaries listed by name', async () => {
    await renderPage()

    expect(screen.getByText('Informe um valor para consultar a cotação.')).toBeInTheDocument()
    expect(continueButton()).toBeDisabled()
    expect(getCompanyBeneficiaries).toHaveBeenCalledWith('c1', { size: 100 })
    expect(screen.getByRole('option', { name: 'Atlas Imports LLC · USD' })).toBeInTheDocument()
    expect(getTransferQuote).not.toHaveBeenCalled()
  })

  it('requests a single SOURCE quote after the debounce while the user is still typing', async () => {
    await renderPage()

    fireEvent.change(sourceInput(), { target: { value: '12' } })
    fireEvent.change(sourceInput(), { target: { value: '12500' } })
    fireEvent.change(sourceInput(), { target: { value: '125.000,00' } })
    await advance(DEBOUNCE_MS - 1)
    expect(getTransferQuote).not.toHaveBeenCalled()

    await advance(1)

    expect(getTransferQuote).toHaveBeenCalledTimes(1)
    expect(getTransferQuote).toHaveBeenCalledWith(
      { amount: 125000, amountType: 'SOURCE', sourceCurrency: 'BRL', destinationCurrency: 'USDC' },
      expect.any(AbortSignal),
    )
  })

  it('shows the values returned by the backend, only formatted', async () => {
    await renderPage()

    await typeSourceAmount('125000')

    expect(screen.getByText('1 USD = R$ 5,16')).toBeInTheDocument()
    expect(screen.getByText('0,45% • R$ 562,50')).toBeInTheDocument()
    expect(screen.getByText('R$ 125.562,50')).toBeInTheDocument()
    expect(destinationInput()).toHaveValue('24.235,14')
  })

  it('quotes by DESTINATION when the destination amount is edited and fills the source amount', async () => {
    await renderPage()

    fireEvent.change(destinationInput(), { target: { value: '24235,14' } })
    await advance(DEBOUNCE_MS)

    expect(getTransferQuote).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 24235.14, amountType: 'DESTINATION' }),
      expect.any(AbortSignal),
    )
    expect(sourceInput()).toHaveValue('125.000,00')
  })

  it('hides the previous quote while a new one is loading', async () => {
    await renderPage()
    await typeSourceAmount('125000')
    vi.mocked(getTransferQuote).mockReturnValue(new Promise(() => {}))

    await typeSourceAmount('130000')

    expect(screen.getByRole('status')).toHaveTextContent('Atualizando cotação...')
    expect(screen.queryByText('R$ 125.562,50')).not.toBeInTheDocument()
    expect(screen.queryByText('1 USD = R$ 5,16')).not.toBeInTheDocument()
  })

  it('shows the backend message on a 422 quote error, keeps no stale values and allows a retry', async () => {
    await renderPage()
    await typeSourceAmount('125000')
    vi.mocked(getTransferQuote).mockRejectedValueOnce(
      httpError(422, 'Usuário não possui verificação KYC associada'),
    )
    fireEvent.change(beneficiarySelect(), { target: { value: atlas.id } })

    await typeSourceAmount('130000')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Usuário não possui verificação KYC associada',
    )
    expect(screen.queryByText('R$ 125.562,50')).not.toBeInTheDocument()
    expect(continueButton()).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await advance(DEBOUNCE_MS)

    expect(getTransferQuote).toHaveBeenCalledTimes(3)
    expect(screen.getByText('R$ 125.562,50')).toBeInTheDocument()
  })

  it('shows a generic message when the quote fails for another reason', async () => {
    vi.mocked(getTransferQuote).mockRejectedValueOnce(httpError(503, 'Avenia fora do ar'))
    await renderPage()

    await typeSourceAmount('125000')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível obter a cotação. Tente novamente.',
    )
  })

  it('does not request a quote for an invalid amount', async () => {
    await renderPage()

    await typeSourceAmount('0')

    expect(getTransferQuote).not.toHaveBeenCalled()
    expect(screen.getByText('Informe um valor maior que zero')).toBeInTheDocument()
  })

  it('uses USDC for a crypto wallet beneficiary without a registered currency', async () => {
    const wallet: Beneficiary = {
      ...atlas,
      id: '9b2e4c1a-3f6d-4e8b-a1c2-7d5f0e9b3a41',
      legalName: 'Carteira Demo',
      receivingMethod: 'CRYPTO_WALLET',
      currency: undefined,
    }
    vi.mocked(getCompanyBeneficiaries).mockResolvedValue({
      content: [wallet],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 100,
    })
    await renderPage()

    fireEvent.change(beneficiarySelect(), { target: { value: wallet.id } })
    await typeSourceAmount('1000')

    expect(screen.getByRole('option', { name: 'Carteira Demo' })).toBeInTheDocument()
    expect(getTransferQuote).toHaveBeenCalledWith(
      expect.objectContaining({ destinationCurrency: 'USDC' }),
      expect.any(AbortSignal),
    )
  })

  it('quotes again with the currency of the selected beneficiary', async () => {
    await renderPage()
    await typeSourceAmount('125000')

    fireEvent.change(beneficiarySelect(), { target: { value: euroSupplier.id } })
    await advance(DEBOUNCE_MS)

    expect(getTransferQuote).toHaveBeenLastCalledWith(
      expect.objectContaining({ destinationCurrency: 'EUR' }),
      expect.any(AbortSignal),
    )
    expect(screen.getByLabelText('Valor de destino (EUR) *')).toBeInTheDocument()
  })

  it('creates the transfer without any quote data and keeps Continuar disabled during the request', async () => {
    let resolveCreate: (value: { status: 'PROCESSING' }) => void = () => {}
    vi.mocked(createTransfer).mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve
      }),
    )
    await renderPage()
    fireEvent.change(beneficiarySelect(), { target: { value: atlas.id } })
    fireEvent.change(screen.getByLabelText('Descrição'), {
      target: { value: 'Pagamento de importação' },
    })
    await typeSourceAmount('125000')
    expect(continueButton()).toBeEnabled()

    fireEvent.click(continueButton())
    await advance()

    expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled()
    expect(createTransfer).toHaveBeenCalledTimes(1)
    expect(createTransfer).toHaveBeenCalledWith({
      amount: 125000,
      amountType: 'SOURCE',
      sourceCurrency: 'BRL',
      destinationCurrency: 'USD',
      paymentMethod: 'ACCOUNT_BALANCE',
      beneficiaryId: atlas.id,
      description: 'Pagamento de importação',
    })
    const payload = vi.mocked(createTransfer).mock.calls[0]![0]
    expect(payload).not.toHaveProperty('quoteId')
    expect(payload).not.toHaveProperty('quoteToken')
    expect(payload).not.toHaveProperty('ticketId')

    resolveCreate({ status: 'PROCESSING' })
    await advance()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Transferência criada com sucesso. Status: em processamento.',
    )
    expect(sourceInput()).toHaveValue('')
  })

  it('keeps the filled data and shows a message when the transfer creation fails', async () => {
    vi.mocked(createTransfer).mockRejectedValueOnce(httpError(404, 'Beneficiário não encontrado'))
    await renderPage()
    fireEvent.change(beneficiarySelect(), { target: { value: atlas.id } })
    await typeSourceAmount('125000')

    fireEvent.click(continueButton())
    await advance()

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Beneficiário não encontrado. Selecione outro beneficiário.',
    )
    expect(sourceInput()).toHaveValue('125000')
    expect(beneficiarySelect()).toHaveValue(atlas.id)
    expect(continueButton()).toBeEnabled()
  })

  it('shows a generic message when the creation fails without a known status', async () => {
    vi.mocked(createTransfer).mockRejectedValueOnce(new Error('network down'))
    await renderPage()
    fireEvent.change(beneficiarySelect(), { target: { value: atlas.id } })
    await typeSourceAmount('125000')

    fireEvent.click(continueButton())
    await advance()

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível criar a transferência. Tente novamente.',
    )
  })

  it('keeps Continuar disabled until a beneficiary is selected', async () => {
    await renderPage()

    await typeSourceAmount('125000')

    expect(continueButton()).toBeDisabled()
  })

  it('clears the form and the quote when Cancelar is clicked', async () => {
    await renderPage()
    fireEvent.change(beneficiarySelect(), { target: { value: atlas.id } })
    await typeSourceAmount('125000')

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await advance(DEBOUNCE_MS)

    expect(sourceInput()).toHaveValue('')
    expect(destinationInput()).toHaveValue('')
    expect(beneficiarySelect()).toHaveValue('')
    expect(screen.getByText('Informe um valor para consultar a cotação.')).toBeInTheDocument()
    expect(getTransferQuote).toHaveBeenCalledTimes(1)
  })

  it('shows an alert when the beneficiaries cannot be loaded', async () => {
    vi.mocked(getCompanyBeneficiaries).mockRejectedValueOnce(
      new Error('Request failed with status 403'),
    )

    await renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os beneficiários.',
    )
    expect(beneficiarySelect()).toBeDisabled()
  })
})
