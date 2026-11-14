import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCompanyBeneficiaries } from '@/features/beneficiaries'
import type { Beneficiary } from '@/features/beneficiaries'
import { useSession } from '@/features/auth'
import { requestOrchestratedQuote } from '@/features/transfers/api/orchestratedTransfers'
import { OrchestratedTransferCreate } from './OrchestratedTransferCreate'

vi.mock('@/features/beneficiaries', () => ({ getCompanyBeneficiaries: vi.fn() }))
vi.mock('@/features/auth', () => ({ useSession: vi.fn() }))
vi.mock('@/features/transfers/api/orchestratedTransfers', () => ({
  requestOrchestratedQuote: vi.fn(),
}))
vi.mock(
  '@/features/transfers/components/OrchestratedOfferConfirmation/OrchestratedOfferConfirmation',
  () => ({
    OrchestratedOfferConfirmation: ({
      offer,
      onAuthorizationAttempt,
      onDefinitiveRejection,
    }: {
      offer: { offerId: string }
      onAuthorizationAttempt?: () => void
      onDefinitiveRejection?: () => void
    }) => (
      <div data-testid="authorization">
        Autorização TOTP {offer.offerId}
        <button type="button" onClick={onAuthorizationAttempt}>
          Simular autorização
        </button>
        <button type="button" onClick={onDefinitiveRejection}>
          Simular rejeição definitiva
        </button>
      </div>
    ),
  }),
)

const wallet: Beneficiary = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  companyId: 'company-1',
  nickname: 'Carteira',
  legalName: 'Carteira de teste',
  receivingMethod: 'CRYPTO_WALLET',
  currency: 'USDC',
  blockchainNetwork: 'POLYGON',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
}

const bank: Beneficiary = {
  ...wallet,
  id: '6fa459ea-ee8a-4ca4-894e-db77e160355e',
  legalName: 'Fornecedor Internacional',
  receivingMethod: 'BANK_ACCOUNT',
  currency: 'USD',
  paymentRail: 'wire',
  blockchainNetwork: null,
}

const offer = {
  quoteRequestId: '49960b31-3ef9-486f-a1b7-2dac8436c9f1',
  offer: {
    offerId: '277ba36d-ac63-4315-bb09-8a40fbd1b879',
    provider: 'BLINDPAY',
    sourceAmount: 1000,
    targetAmount: 180,
    exchangeRate: 0.18,
    totalFee: 2.5,
    expiresAt: '2099-01-01T00:00:00Z',
  },
} as const

describe('OrchestratedTransferCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSession).mockReturnValue({
      status: 'authenticated',
      user: {
        id: 'user-1',
        name: 'Operadora',
        email: 'operadora@example.test',
        companyId: 'company-1',
        accountType: 'USER',
        roles: ['ROLE_USER'],
      },
      company: null,
      error: null,
      retry: vi.fn(),
    })
    vi.mocked(getCompanyBeneficiaries).mockResolvedValue({
      content: [wallet, bank],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 100,
    })
    vi.mocked(requestOrchestratedQuote).mockResolvedValue(offer)
  })

  it('requires valid data and never submits a financial confirmation while quoting', async () => {
    const user = userEvent.setup()
    render(<OrchestratedTransferCreate />)
    const quoteButton = screen.getByRole('button', { name: 'Consultar melhor oferta' })
    expect(quoteButton).toBeDisabled()
    await user.selectOptions(await screen.findByLabelText('Beneficiário'), wallet.id)
    expect(screen.queryByLabelText('Modalidade bancária cadastrada')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Valor'), '1.000,00')
    await user.click(quoteButton)

    await waitFor(() => expect(requestOrchestratedQuote).toHaveBeenCalledTimes(1))
    expect(requestOrchestratedQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        beneficiaryId: wallet.id,
        direction: 'PAYOUT',
        sourceCurrency: 'BRL',
        targetCurrency: 'USDC',
        sourcePaymentMethod: 'pix',
        amount: 1000,
        amountSide: 'SOURCE',
      }),
      expect.any(AbortSignal),
    )
    expect(await screen.findByTestId('authorization')).toHaveTextContent(offer.offer.offerId)
  })

  it('uses the bank route with explicit token and network for BlindPay', async () => {
    const user = userEvent.setup()
    render(<OrchestratedTransferCreate />)
    await user.selectOptions(await screen.findByLabelText('Beneficiário'), bank.id)
    expect(screen.queryByLabelText('Modalidade bancária cadastrada')).not.toBeInTheDocument()
    expect(screen.getByText(/Modalidade bancária cadastrada: wire/i)).toBeVisible()
    await user.selectOptions(screen.getByLabelText('Rede'), 'ethereum')
    await user.selectOptions(screen.getByLabelText('Valor informado em'), 'TARGET')
    await user.type(screen.getByLabelText('Valor'), '200,50')
    await user.click(screen.getByRole('button', { name: 'Consultar melhor oferta' }))

    expect(requestOrchestratedQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        beneficiaryId: bank.id,
        targetCurrency: 'USD',
        targetPaymentMethod: 'wire',
        token: 'USDC',
        blockchainNetwork: 'ethereum',
        amount: 200.5,
        amountSide: 'TARGET',
        coverFees: true,
      }),
      expect.any(AbortSignal),
    )
  })

  it('does not guess SWIFT for a bank beneficiary when the registered rail is unknown', async () => {
    const user = userEvent.setup()
    vi.mocked(getCompanyBeneficiaries).mockResolvedValueOnce({
      content: [{ ...bank, paymentRail: undefined }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 100,
    })
    render(<OrchestratedTransferCreate />)
    await user.selectOptions(await screen.findByLabelText('Beneficiário'), bank.id)
    await user.type(screen.getByLabelText('Valor'), '1000')
    const quoteButton = screen.getByRole('button', { name: 'Consultar melhor oferta' })
    expect(quoteButton).toBeDisabled()
    expect(requestOrchestratedQuote).not.toHaveBeenCalled()

    await user.selectOptions(screen.getByLabelText('Modalidade bancária cadastrada'), 'wire')
    expect(quoteButton).toBeEnabled()
    await user.click(quoteButton)
    expect(requestOrchestratedQuote).toHaveBeenCalledWith(
      expect.objectContaining({ targetPaymentMethod: 'wire' }),
      expect.any(AbortSignal),
    )
  })

  it('invalidates the previous offer whenever its underlying values change', async () => {
    const user = userEvent.setup()
    render(<OrchestratedTransferCreate />)
    await user.selectOptions(await screen.findByLabelText('Beneficiário'), bank.id)
    await user.type(screen.getByLabelText('Valor'), '1000')
    await user.click(screen.getByRole('button', { name: 'Consultar melhor oferta' }))
    expect(await screen.findByTestId('authorization')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Valor'))
    await user.type(screen.getByLabelText('Valor'), '2000')
    expect(screen.queryByTestId('authorization')).not.toBeInTheDocument()
    expect(requestOrchestratedQuote).toHaveBeenCalledTimes(1)
  })

  it('freezes quote inputs after a financial confirmation attempt until definitive rejection', async () => {
    const user = userEvent.setup()
    render(<OrchestratedTransferCreate />)
    await user.selectOptions(await screen.findByLabelText('Beneficiário'), bank.id)
    await user.type(screen.getByLabelText('Valor'), '1000')
    await user.click(screen.getByRole('button', { name: 'Consultar melhor oferta' }))
    expect(await screen.findByTestId('authorization')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Simular autorização' }))
    expect(screen.getByLabelText('Valor')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Consultar melhor oferta' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('dados estão bloqueados')
    expect(requestOrchestratedQuote).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Simular rejeição definitiva' }))
    expect(screen.getByLabelText('Valor')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Consultar melhor oferta' })).toBeEnabled()
  })

  it('does not display stale responses after the user changes the inputs', async () => {
    const user = userEvent.setup()
    let resolveQuote!: (value: typeof offer) => void
    vi.mocked(requestOrchestratedQuote).mockReturnValue(
      new Promise((resolve) => {
        resolveQuote = resolve
      }),
    )
    render(<OrchestratedTransferCreate />)
    await user.selectOptions(await screen.findByLabelText('Beneficiário'), bank.id)
    await user.type(screen.getByLabelText('Valor'), '1000')
    await user.click(screen.getByRole('button', { name: 'Consultar melhor oferta' }))
    await user.clear(screen.getByLabelText('Valor'))
    resolveQuote(offer)
    expect(screen.queryByTestId('authorization')).not.toBeInTheDocument()
  })

  it('does not offer a financial action when the server rejects the quote', async () => {
    const user = userEvent.setup()
    vi.mocked(requestOrchestratedQuote).mockRejectedValue(new Error('confidential provider error'))
    render(<OrchestratedTransferCreate />)
    await user.selectOptions(await screen.findByLabelText('Beneficiário'), bank.id)
    await user.type(screen.getByLabelText('Valor'), '1000')
    await user.click(screen.getByRole('button', { name: 'Consultar melhor oferta' }))
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(/não foi possível obter uma oferta válida/i)).toBeVisible()
    expect(screen.queryByTestId('authorization')).not.toBeInTheDocument()
    expect(screen.queryByText('confidential provider error')).not.toBeInTheDocument()
  })
})
