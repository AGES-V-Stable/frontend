import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCompanyBeneficiaries } from '@/features/beneficiaries/api/beneficiary'
import { HttpError } from '@/shared/http/httpClient'
import { createTransfer, getTransferQuote } from '@/features/transfers/api/transfers'
import { useSession } from '@/features/auth'
import type { Beneficiary } from '@/features/beneficiaries/types/beneficiary'
import type { TransferQuoteResponse } from '@/features/transfers/types/transfer'

import { TransferCreate } from '@/features/transfers/pages/client/transferCreate/TransferCreate'

vi.mock('@/features/transfers/api/transfers', () => ({
  getTransferQuote: vi.fn(),
  createTransfer: vi.fn(),
}))
vi.mock('@/features/beneficiaries/api/beneficiary', () => ({ getCompanyBeneficiaries: vi.fn() }))
vi.mock('@/features/auth', () => ({ useSession: vi.fn() }))

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

const sourceInput = () => screen.getByLabelText('Valor de origem*')
const destinationInput = () => screen.getByLabelText('Valor de Destino*')
const beneficiarySelect = () => screen.getByLabelText('Beneficiário*')
const continueButton = () => screen.getByRole('button', { name: 'Continuar' })
const confirmAndAuthButton = () => screen.getByRole('button', { name: 'Confirmar e Autenticar' })
const backButton = () => screen.getByRole('button', { name: 'Voltar' })
const confirmTransferButton = () => screen.getByRole('button', { name: /Confirmar transferência/i })
const totpInput = () => screen.getByLabelText('Código de autenticação')

const renderPage = async () => {
  render(<TransferCreate />)
  await advance()
}

const typeSourceAmount = async (text: string) => {
  fireEvent.change(sourceInput(), { target: { value: text } })
  await advance(DEBOUNCE_MS)
}

const fillStep0 = async () => {
  fireEvent.change(beneficiarySelect(), { target: { value: atlas.id } })
  fireEvent.change(screen.getByLabelText('Descrição'), {
    target: { value: 'Pagamento de importação' },
  })
  await typeSourceAmount('125000')
}

const goToReview = async () => {
  await fillStep0()
  fireEvent.click(continueButton())
  await advance()
}

const goToAuth = async () => {
  await goToReview()
  fireEvent.click(confirmAndAuthButton())
  await advance()
}

describe('TransferCreate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(useSession).mockReturnValue({
      status: 'authenticated',
      user: {
        id: 'u1',
        name: 'Marina Costa',
        email: 'marina@example.com',
        companyId: 'c1',
        accountType: 'USER',
        roles: ['ROLE_USER'],
      },
      company: null,
      error: null,
      retry: vi.fn(),
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
    expect(getCompanyBeneficiaries).toHaveBeenCalledWith(
      'c1',
      { size: 100 },
      expect.any(AbortSignal),
    )
    expect(screen.getByRole('option', { name: 'Atlas Imports LLC' })).toBeInTheDocument()
    expect(getTransferQuote).not.toHaveBeenCalled()
  })

  it('shows the transfer steps with Dados as the current one', async () => {
    await renderPage()

    expect(screen.getByLabelText('Passo 1 de 3')).toBeInTheDocument()
    expect(screen.getByText('Dados').closest('li')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText('Revisão')).toBeInTheDocument()
    expect(screen.getByText('Autenticação')).toBeInTheDocument()
  })

  it('shows the currency symbol of each side inside the amount fields', async () => {
    await renderPage()

    expect(screen.getByText('R$')).toBeInTheDocument()
    expect(screen.getByText('US$')).toBeInTheDocument()
  })

  it('keeps Cancelar and Continuar together in the form card', async () => {
    await renderPage()

    const formCard = screen
      .getByRole('heading', { name: 'Dados da transferência' })
      .closest('section')
    expect(formCard).toContainElement(continueButton())
    expect(formCard).toContainElement(screen.getByRole('button', { name: 'Cancelar' }))
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
      { amount: 125000, amountType: 'SOURCE', sourceCurrency: 'BRL', destinationCurrency: 'USD' },
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

  it('quotes again with the currency of the selected beneficiary', async () => {
    await renderPage()
    await typeSourceAmount('125000')

    fireEvent.change(beneficiarySelect(), { target: { value: euroSupplier.id } })
    await advance(DEBOUNCE_MS)

    expect(getTransferQuote).toHaveBeenLastCalledWith(
      expect.objectContaining({ destinationCurrency: 'EUR' }),
      expect.any(AbortSignal),
    )
    expect(screen.getByText('€')).toBeInTheDocument()
  })

  it('clears the value derived from the previous quote when the beneficiary currency changes', async () => {
    await renderPage()
    await typeSourceAmount('125000')
    expect(destinationInput()).not.toHaveValue('')

    fireEvent.change(beneficiarySelect(), { target: { value: euroSupplier.id } })

    expect(destinationInput()).toHaveValue('')
    expect(screen.getByText('Atualizando cotação...')).toBeInTheDocument()
    expect(continueButton()).toBeDisabled()
  })

  it('advances from Passo 0 to Passo 1 (Revisão) when Continuar is clicked and does NOT call createTransfer', async () => {
    await renderPage()
    await fillStep0()
    expect(continueButton()).toBeEnabled()

    fireEvent.click(continueButton())
    await advance()

    expect(screen.getByText('Revisão da transferência')).toBeInTheDocument()
    expect(screen.getByLabelText('Passo 2 de 3')).toBeInTheDocument()
    expect(screen.getByText('Revisão').closest('li')).toHaveAttribute('aria-current', 'step')
    expect(createTransfer).not.toHaveBeenCalled()
  })

  it('blocks advancing from Passo 0 when beneficiary is not selected', async () => {
    await renderPage()
    await typeSourceAmount('125000')

    expect(continueButton()).toBeDisabled()
  })

  it('displays consolidated data correctly in Passo 1 (Revisão)', async () => {
    await renderPage()
    await goToReview()

    expect(screen.getByText('Atlas Imports LLC')).toBeInTheDocument()
    expect(screen.getByText('Saldo em Conta')).toBeInTheDocument()
    expect(screen.getByText('Pagamento de importação')).toBeInTheDocument()
    expect(screen.getAllByText('1 USD = R$ 5,16').length).toBeGreaterThan(0)
    expect(screen.getAllByText('0,45% • R$ 562,50').length).toBeGreaterThan(0)
    expect(screen.getAllByText('R$ 125.562,50').length).toBeGreaterThan(0)
  })

  it('returns from Passo 1 to Passo 0 when Voltar is clicked, preserving the typed values', async () => {
    await renderPage()
    await goToReview()

    expect(screen.getByText('Revisão da transferência')).toBeInTheDocument()

    fireEvent.click(backButton())
    await advance()

    expect(screen.getByText('Dados da transferência')).toBeInTheDocument()
    expect(screen.getByLabelText('Passo 1 de 3')).toBeInTheDocument()
    expect(sourceInput()).toHaveValue('125000')
    expect(destinationInput()).toHaveValue('24.235,14')
    expect(beneficiarySelect()).toHaveValue(atlas.id)
    expect(screen.getByLabelText('Descrição')).toHaveValue('Pagamento de importação')
    expect(createTransfer).not.toHaveBeenCalled()
  })

  it('advances from Passo 1 to Passo 2 (Autenticação) when Confirmar e Autenticar is clicked', async () => {
    await renderPage()
    await goToAuth()

    expect(screen.getByText('Autenticação em duas etapas')).toBeInTheDocument()
    expect(screen.getByLabelText('Passo 3 de 3')).toBeInTheDocument()
    expect(screen.getByText('Autenticação').closest('li')).toHaveAttribute('aria-current', 'step')
    expect(totpInput()).toBeInTheDocument()
    expect(createTransfer).not.toHaveBeenCalled()
  })

  it('does NOT call POST /v1/transfers before complete 6-digit TOTP code is entered in Passo 2', async () => {
    await renderPage()
    await goToAuth()

    expect(confirmTransferButton()).toBeDisabled()

    fireEvent.change(totpInput(), { target: { value: '12345' } })
    expect(confirmTransferButton()).toBeDisabled()
    expect(createTransfer).not.toHaveBeenCalled()
  })

  it('submits POST /v1/transfers with totpCode in payload when 6 digits are provided and handles success', async () => {
    let resolveCreate: (value: { status: 'PROCESSING' }) => void = () => {}
    vi.mocked(createTransfer).mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve
      }),
    )

    await renderPage()
    await goToAuth()

    fireEvent.change(totpInput(), { target: { value: '123456' } })
    expect(confirmTransferButton()).toBeEnabled()

    fireEvent.click(confirmTransferButton())
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
      totpCode: '123456',
    })

    resolveCreate({ status: 'PROCESSING' })
    await advance()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Transferência criada com sucesso. Status: em processamento.',
    )
    expect(screen.getByText('Dados da transferência')).toBeInTheDocument()
    expect(sourceInput()).toHaveValue('')
  })

  it('displays TOTP error clearly in Passo 2 and preserves form data when backend rejects the code', async () => {
    vi.mocked(createTransfer).mockRejectedValueOnce(
      httpError(401, 'Código de autenticação inválido ou expirado.'),
    )

    await renderPage()
    await goToAuth()

    fireEvent.change(totpInput(), { target: { value: '000000' } })
    fireEvent.click(confirmTransferButton())
    await advance()

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Código de autenticação inválido ou expirado.',
    )
    expect(screen.getByText('Autenticação em duas etapas')).toBeInTheDocument()
    expect(totpInput()).toBeInTheDocument()

    // Volta para Revisão e Dados para verificar que os dados preenchidos não foram perdidos
    fireEvent.click(backButton())
    await advance()
    expect(screen.getByText('Revisão da transferência')).toBeInTheDocument()

    fireEvent.click(backButton())
    await advance()
    expect(screen.getByText('Dados da transferência')).toBeInTheDocument()
    expect(sourceInput()).toHaveValue('125000')
    expect(beneficiarySelect()).toHaveValue(atlas.id)
  })

  it('shows generic creation error message when request fails with unexpected error', async () => {
    vi.mocked(createTransfer).mockRejectedValueOnce(new Error('network down'))

    await renderPage()
    await goToAuth()

    fireEvent.change(totpInput(), { target: { value: '123456' } })
    fireEvent.click(confirmTransferButton())
    await advance()

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível criar a transferência. Tente novamente.',
    )
    expect(screen.getByText('Autenticação em duas etapas')).toBeInTheDocument()
  })

  it('returns from Passo 2 to Passo 1 when Voltar is clicked', async () => {
    await renderPage()
    await goToAuth()

    fireEvent.click(backButton())
    await advance()

    expect(screen.getByText('Revisão da transferência')).toBeInTheDocument()
    expect(screen.getByLabelText('Passo 2 de 3')).toBeInTheDocument()
  })

  it('alterna para o modo de recuperação em Passo 2 e submete a transferência com código de emergência', async () => {
    vi.mocked(createTransfer).mockResolvedValueOnce({ status: 'PROCESSING' })

    await renderPage()
    await goToAuth()

    expect(
      screen.getByRole('button', { name: 'Perdi meu celular / Usar código de recuperação' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('timer')).toBeInTheDocument()

    // Clica no botão de recuperação
    fireEvent.click(
      screen.getByRole('button', { name: 'Perdi meu celular / Usar código de recuperação' }),
    )
    await advance()

    // Timer e input de 6 dígitos somem
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Código de autenticação')).not.toBeInTheDocument()

    // Input de recuperação de 8 caracteres está presente
    const recoveryInput = screen.getByTestId('recovery-code-input')
    expect(recoveryInput).toBeInTheDocument()
    expect(confirmTransferButton()).toBeDisabled()

    // Preenche os 8 caracteres
    fireEvent.change(recoveryInput, { target: { value: 'ABCD-1234' } })
    expect(confirmTransferButton()).toBeEnabled()

    // Submete
    fireEvent.click(confirmTransferButton())
    await advance()

    expect(createTransfer).toHaveBeenCalledWith({
      amount: 125000,
      amountType: 'SOURCE',
      sourceCurrency: 'BRL',
      destinationCurrency: 'USD',
      paymentMethod: 'ACCOUNT_BALANCE',
      beneficiaryId: atlas.id,
      description: 'Pagamento de importação',
      totpCode: 'ABCD-1234',
    })
    expect(screen.getByRole('status')).toHaveTextContent(
      'Transferência criada com sucesso. Status: em processamento.',
    )
  })

  it('clears the form and returns to step 0 when Cancelar is clicked in Passo 0', async () => {
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

  it('displays the 48h withdrawal lock alert banner and disables Continuar when withdrawalLockedUntil is active', async () => {
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    vi.mocked(useSession).mockReturnValue({
      status: 'authenticated',
      user: {
        id: 'u1',
        name: 'Marina Costa',
        email: 'marina@example.com',
        companyId: 'c1',
        accountType: 'USER',
        roles: ['ROLE_USER'],
        withdrawalLockedUntil: futureDate,
      },
      company: null,
      error: null,
      retry: vi.fn(),
    })

    await renderPage()

    const banner = screen.getByRole('alert')
    expect(banner).toHaveTextContent(
      'Por medidas de segurança, transferências estão temporariamente bloqueadas por 48 horas devido à redefinição recente do seu 2FA',
    )
    expect(banner).toHaveTextContent('Bloqueio ativo até:')

    await fillStep0()
    expect(continueButton()).toBeDisabled()

    fireEvent.click(continueButton())
    await advance()
    expect(screen.queryByText('Revisão da transferência')).not.toBeInTheDocument()
  })

  it('ignores a withdrawal lock left in the browser by another account', async () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString()
    localStorage.setItem('vstable_withdrawal_locked_until', futureDate)

    await renderPage()

    expect(
      screen.queryByText(/transferências estão temporariamente bloqueadas/i),
    ).not.toBeInTheDocument()
    await fillStep0()
    expect(continueButton()).toBeEnabled()
    localStorage.removeItem('vstable_withdrawal_locked_until')
  })

  it('does not display 48h withdrawal lock banner when withdrawalLockedUntil is expired in the past', async () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString()
    vi.mocked(useSession).mockReturnValue({
      status: 'authenticated',
      user: {
        id: 'u1',
        name: 'Marina Costa',
        email: 'marina@example.com',
        companyId: 'c1',
        accountType: 'USER',
        roles: ['ROLE_USER'],
        withdrawalLockedUntil: pastDate,
      },
      company: null,
      error: null,
      retry: vi.fn(),
    })

    await renderPage()

    expect(
      screen.queryByText(/transferências estão temporariamente bloqueadas/i),
    ).not.toBeInTheDocument()

    await fillStep0()
    expect(continueButton()).toBeEnabled()
  })
})
