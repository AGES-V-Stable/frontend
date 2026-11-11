import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCompanyBeneficiaries } from '@/features/beneficiaries/api/beneficiary'
import { HttpError } from '@/shared/http/httpClient'
import {
  confirmOffer,
  confirmRequote,
  createQuote,
  getTransferExecution,
} from '@/features/transfers/api/transfers'
import { useSession } from '@/features/auth'
import type { Beneficiary } from '@/features/beneficiaries/types/beneficiary'
import type { QuoteResponse, TransferExecution } from '@/features/transfers/types/transfer'
import { formatMoney } from '@/shared/utils/formatters'
import { EXECUTION_PARAM, EXECUTION_POLL_MS } from '@/features/transfers/hooks/useTransferCreate'

import { TransferCreate } from '@/features/transfers/pages/client/transferCreate/TransferCreate'

vi.mock('@/features/transfers/api/transfers', () => ({
  createQuote: vi.fn(),
  confirmOffer: vi.fn(),
  getTransferExecution: vi.fn(),
  confirmRequote: vi.fn(),
}))
vi.mock('@/features/beneficiaries/api/beneficiary', () => ({ getCompanyBeneficiaries: vi.fn() }))
vi.mock('@/features/auth', () => ({ useSession: vi.fn() }))

const DEBOUNCE_MS = 500
const OFFER_ID = '7d7f2a54-8f0b-4c1e-9f0e-3c2a1b0d9e8f'
const EXECUTION_ID = '0b1c2d3e-4f50-4617-8293-a4b5c6d7e8f9'

const atlas: Beneficiary = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  companyId: 'c1',
  nickname: 'Atlas',
  legalName: 'Atlas Imports LLC',
  currency: 'USD',
  paymentRail: 'ach',
  receivingMethod: 'BANK_ACCOUNT',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const withoutRail: Beneficiary = {
  ...atlas,
  id: '6fa459ea-ee8a-4ca4-894e-db77e160355e',
  nickname: 'Rhein',
  legalName: 'Rhein Handel GmbH',
  currency: 'EUR',
  paymentRail: null,
}

// Carteira cadastrada pela tela atual: sem moeda; o backend preenche paymentRail por padrão.
const wallet: Beneficiary = {
  ...atlas,
  id: '9b2f6c1e-3d4a-4b5c-8d6e-7f8091a2b3c4',
  nickname: 'Treasury wallet',
  legalName: 'Treasury Wallet Ltd',
  receivingMethod: 'CRYPTO_WALLET',
  currency: null,
  paymentRail: 'international_swift',
  blockchainNetwork: 'polygon',
}

const usdtWallet: Beneficiary = {
  ...wallet,
  id: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
  legalName: 'USDT Wallet Ltd',
  currency: 'USDT',
}

const walletWithoutNetwork: Beneficiary = {
  ...wallet,
  id: '2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a',
  legalName: 'Broken Wallet Ltd',
  blockchainNetwork: null,
}

let quote: QuoteResponse

const offerFor = (sourceAmount: number, targetAmount: number, provider = 'BLINDPAY') => ({
  quoteRequestId: '1a2b3c4d-5e6f-4789-8abc-def012345678',
  offer: {
    offerId: OFFER_ID,
    sourceAmount,
    targetAmount,
    exchangeRate: targetAmount / sourceAmount,
    totalFee: 3.1,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    provider,
  },
})

const execution = (overrides: Partial<TransferExecution> = {}): TransferExecution => ({
  executionId: EXECUTION_ID,
  offerId: OFFER_ID,
  transactionId: null,
  provider: 'BLINDPAY',
  status: 'AWAITING_FUNDS',
  source: { amount: 1000, currency: 'BRL' },
  target: { amount: 182.45, currency: 'USD' },
  fundingInstructions: '00020126580014br.gov.bcb.pix',
  fundingMethod: 'PIX',
  fundingBankTransfer: null,
  requote: null,
  failureCode: null,
  ...overrides,
})

// O formatador usa espaço não separável; a busca por texto normaliza só o conteúdo da página.
const money = (value: number, currency: string) => formatMoney(value, currency).replace(/\s/g, ' ')

const httpError = (status: number) => new HttpError(`failed with ${status}`, status)

// Deixa as promessas pendentes (serviços mockados) resolverem e avança o relógio falso.
const advance = (ms = 0) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

const sourceInput = () => screen.getByLabelText('Valor de origem*')
const destinationInput = () => screen.getByLabelText('Valor de Destino*')
const beneficiarySelect = () => screen.getByLabelText('Beneficiário*')
const paymentSelect = () => screen.getByLabelText('Método de Pagamento*')
const continueButton = () => screen.getByRole('button', { name: 'Continuar' })
const confirmButton = () => screen.getByRole('button', { name: 'Confirmar transferência' })

// Mostra a query string atual: é ela que permite retomar a execução ao recarregar a página.
function LocationProbe() {
  return <span data-testid="location">{useLocation().search}</span>
}

const currentSearch = () => screen.getByTestId('location').textContent

const renderPage = async (path = '/app/transferencias') => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <TransferCreate />
      <LocationProbe />
    </MemoryRouter>,
  )
  await advance()
}

const reloadWithExecution = (id = EXECUTION_ID) =>
  renderPage(`/app/transferencias?${EXECUTION_PARAM}=${id}`)

const typeSourceAmount = async (text: string) => {
  fireEvent.change(sourceInput(), { target: { value: text } })
  await advance(DEBOUNCE_MS)
}

const fillStep0 = async () => {
  fireEvent.change(beneficiarySelect(), { target: { value: atlas.id } })
  fireEvent.change(screen.getByLabelText('Descrição'), {
    target: { value: 'Pagamento de importação' },
  })
  await typeSourceAmount('1000')
}

const goToReview = async () => {
  await fillStep0()
  fireEvent.click(continueButton())
  await advance()
}

const goToPayment = async () => {
  await goToReview()
  fireEvent.click(confirmButton())
  await advance()
}

const sessionUser = (withdrawalLockedUntil?: string) => ({
  status: 'authenticated' as const,
  user: {
    id: 'u1',
    name: 'Marina Costa',
    email: 'marina@example.com',
    companyId: 'c1',
    accountType: 'USER' as const,
    roles: ['ROLE_USER'],
    ...(withdrawalLockedUntil ? { withdrawalLockedUntil } : {}),
  },
  company: null,
  error: null,
  retry: vi.fn(),
})

describe('TransferCreate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    quote = offerFor(1000, 182.45)
    vi.mocked(useSession).mockReturnValue(sessionUser())
    vi.mocked(getCompanyBeneficiaries).mockResolvedValue({
      content: [atlas, withoutRail, wallet, usdtWallet, walletWithoutNetwork],
      totalElements: 5,
      totalPages: 1,
      number: 0,
      size: 100,
    })
    vi.mocked(createQuote).mockImplementation(async () => quote)
    vi.mocked(confirmOffer).mockResolvedValue(execution())
    vi.mocked(getTransferExecution).mockResolvedValue(execution({ status: 'COMPLETED' }))
    vi.mocked(confirmRequote).mockResolvedValue(execution({ status: 'FUNDS_RECEIVED' }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Dados', () => {
    it('starts without a quote, offers PIX and TED and lists the beneficiaries by name', async () => {
      await renderPage()

      expect(
        screen.getByText('Selecione o beneficiário e informe um valor para consultar a cotação.'),
      ).toBeInTheDocument()
      expect(continueButton()).toBeDisabled()
      expect(screen.getByRole('option', { name: 'Atlas Imports LLC' })).toBeInTheDocument()
      const methods = Array.from(paymentSelect().querySelectorAll('option')).map((o) => o.value)
      expect(methods).toEqual(['', 'PIX', 'TED'])
      expect(paymentSelect()).toHaveValue('PIX')
    })

    it('shows the transfer steps ending in Pagamento', async () => {
      await renderPage()

      for (const step of ['Dados', 'Revisão', 'Pagamento'])
        expect(screen.getByText(step)).toBeInTheDocument()
    })

    it('does not quote while no beneficiary is selected', async () => {
      await renderPage()

      await typeSourceAmount('1000')

      expect(createQuote).not.toHaveBeenCalled()
    })

    it('given beneficiary and amount, when the user stops typing, then it requests one quote with the real beneficiary data', async () => {
      await renderPage()
      fireEvent.change(beneficiarySelect(), { target: { value: atlas.id } })
      fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: '  Invoice 7 ' } })

      fireEvent.change(sourceInput(), { target: { value: '10' } })
      await advance(200)
      fireEvent.change(sourceInput(), { target: { value: '1000' } })
      await advance(DEBOUNCE_MS)

      expect(createQuote).toHaveBeenCalledTimes(1)
      expect(vi.mocked(createQuote).mock.calls[0]![0]).toEqual({
        beneficiaryId: atlas.id,
        direction: 'PAYOUT',
        sourceCurrency: 'BRL',
        targetCurrency: 'USD',
        sourcePaymentMethod: 'PIX',
        targetPaymentMethod: 'ach',
        amount: 1000,
        amountSide: 'SOURCE',
        coverFees: false,
        description: 'Invoice 7',
      })
    })

    it('shows the winning offer, its provider and fills the destination amount', async () => {
      await renderPage()

      await fillStep0()

      expect(screen.getByText('BlindPay')).toBeInTheDocument()
      expect(screen.getByText(money(1000, 'BRL'))).toBeInTheDocument()
      expect(screen.getByText(money(182.45, 'USD'))).toBeInTheDocument()
      expect(destinationInput()).toHaveValue('182,45')
      expect(continueButton()).toBeEnabled()
    })

    it('names Avenia when it is the cheapest offer chosen by the backend', async () => {
      quote = offerFor(1000, 183, 'AVENIA')
      await renderPage()

      await fillStep0()

      expect(screen.getByText('Avenia')).toBeInTheDocument()
    })

    it('quotes by TARGET when the destination amount is edited and fills the source amount', async () => {
      quote = offerFor(5481.5, 1000)
      await renderPage()
      fireEvent.change(beneficiarySelect(), { target: { value: atlas.id } })

      fireEvent.change(destinationInput(), { target: { value: '1000' } })
      await advance(DEBOUNCE_MS)

      expect(vi.mocked(createQuote).mock.calls[0]![0]).toMatchObject({
        amount: 1000,
        amountSide: 'TARGET',
      })
      expect(sourceInput()).toHaveValue('5.481,50')
    })

    it('quotes again with TED when the payment method changes', async () => {
      await renderPage()
      await fillStep0()

      fireEvent.change(paymentSelect(), { target: { value: 'TED' } })
      await advance(DEBOUNCE_MS)

      expect(createQuote).toHaveBeenCalledTimes(2)
      expect(vi.mocked(createQuote).mock.calls[1]![0]).toMatchObject({ sourcePaymentMethod: 'TED' })
    })

    it('ignores a slower response for a value the user already changed', async () => {
      let resolveFirst: (value: QuoteResponse) => void = () => {}
      vi.mocked(createQuote)
        .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
        .mockImplementationOnce(async () => offerFor(2000, 365))
      await renderPage()
      fireEvent.change(beneficiarySelect(), { target: { value: atlas.id } })
      await typeSourceAmount('1000')

      await typeSourceAmount('2000')
      resolveFirst(offerFor(1000, 182.45))
      await advance()

      expect(destinationInput()).toHaveValue('365,00')
      expect(screen.queryByText(money(182.45, 'USD'))).not.toBeInTheDocument()
    })

    it('warns and does not quote when the beneficiary has no payment rail', async () => {
      await renderPage()
      fireEvent.change(beneficiarySelect(), { target: { value: withoutRail.id } })

      await typeSourceAmount('1000')

      expect(createQuote).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Este beneficiário não tem moeda ou trilho de recebimento cadastrado',
      )
    })

    it('given a crypto wallet without token, when the user picks one, then it quotes PIX on the registered network', async () => {
      await renderPage()
      fireEvent.change(beneficiarySelect(), { target: { value: wallet.id } })
      await typeSourceAmount('1000')

      expect(createQuote).not.toHaveBeenCalled()
      expect(
        screen.getByText('Escolha o token que a carteira vai receber para consultar a cotação.'),
      ).toBeInTheDocument()
      const methods = Array.from(paymentSelect().querySelectorAll('option')).map((o) => o.value)
      expect(methods).toEqual(['', 'PIX'])

      fireEvent.change(screen.getByLabelText('Token recebido na carteira*'), {
        target: { value: 'USDC' },
      })
      await advance(DEBOUNCE_MS)

      expect(createQuote).toHaveBeenCalledTimes(1)
      expect(vi.mocked(createQuote).mock.calls[0]![0]).toMatchObject({
        beneficiaryId: wallet.id,
        targetCurrency: 'USDC',
        sourcePaymentMethod: 'PIX',
        targetPaymentMethod: 'polygon',
      })
    })

    it('uses the token registered in the wallet without asking for one', async () => {
      await renderPage()
      fireEvent.change(beneficiarySelect(), { target: { value: usdtWallet.id } })

      await typeSourceAmount('1000')

      expect(screen.queryByLabelText('Token recebido na carteira*')).not.toBeInTheDocument()
      expect(vi.mocked(createQuote).mock.calls[0]![0]).toMatchObject({
        targetCurrency: 'USDT',
        targetPaymentMethod: 'polygon',
      })
    })

    it('switches back to PIX when a wallet is chosen after TED was selected', async () => {
      await renderPage()
      fireEvent.change(beneficiarySelect(), { target: { value: atlas.id } })
      fireEvent.change(paymentSelect(), { target: { value: 'TED' } })

      fireEvent.change(beneficiarySelect(), { target: { value: usdtWallet.id } })
      await typeSourceAmount('1000')

      expect(paymentSelect()).toHaveValue('PIX')
      expect(vi.mocked(createQuote).mock.calls[0]![0]).toMatchObject({ sourcePaymentMethod: 'PIX' })
    })

    it('warns and does not quote when the wallet has no network', async () => {
      await renderPage()
      fireEvent.change(beneficiarySelect(), { target: { value: walletWithoutNetwork.id } })

      await typeSourceAmount('1000')

      expect(createQuote).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent('Esta carteira não tem rede cadastrada')
    })

    it('shows the effective rate from the offer amounts, whatever the provider exchangeRate means', async () => {
      // A Avenia já devolveu o basePrice (BRL por token) como exchangeRate.
      quote = { ...offerFor(1000, 180.5, 'AVENIA') }
      quote.offer.exchangeRate = 5.54
      await renderPage()

      await fillStep0()

      expect(screen.getByText('1 BRL = 0,1805 USD')).toBeInTheDocument()
    })

    it('explains when no provider can quote and allows a retry', async () => {
      vi.mocked(createQuote).mockRejectedValueOnce(httpError(422))
      await renderPage()

      await fillStep0()

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Nenhuma cotação disponível para este beneficiário e método de pagamento.',
      )
      expect(continueButton()).toBeDisabled()

      fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
      await advance(DEBOUNCE_MS)

      expect(createQuote).toHaveBeenCalledTimes(2)
      expect(continueButton()).toBeEnabled()
    })

    it('stops showing the offer as valid once it expires and lets the user refresh it', async () => {
      await renderPage()
      await fillStep0()

      await advance(60_000)

      expect(screen.getByRole('alert')).toHaveTextContent('A cotação expirou.')
      expect(continueButton()).toBeDisabled()

      quote = offerFor(1000, 181.9)
      fireEvent.click(screen.getByRole('button', { name: 'Atualizar cotação' }))
      await advance(DEBOUNCE_MS)

      expect(continueButton()).toBeEnabled()
      expect(destinationInput()).toHaveValue('181,90')
    })

    it('clears everything when Cancelar is clicked', async () => {
      await renderPage()
      await fillStep0()

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
      await advance(DEBOUNCE_MS)

      expect(sourceInput()).toHaveValue('')
      expect(destinationInput()).toHaveValue('')
      expect(beneficiarySelect()).toHaveValue('')
      expect(createQuote).toHaveBeenCalledTimes(1)
    })

    it('shows an alert when the beneficiaries cannot be loaded', async () => {
      vi.mocked(getCompanyBeneficiaries).mockRejectedValueOnce(new Error('403'))

      await renderPage()

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Não foi possível carregar os beneficiários.',
      )
      expect(beneficiarySelect()).toBeDisabled()
    })
  })

  describe('Revisão', () => {
    it('shows the offer that will be executed and goes back preserving the form', async () => {
      await renderPage()

      await goToReview()

      expect(screen.getByText('Revisão da transferência')).toBeInTheDocument()
      expect(screen.getByText('Atlas Imports LLC')).toBeInTheDocument()
      expect(screen.getByText('BlindPay')).toBeInTheDocument()
      expect(screen.getByText(money(182.45, 'USD'))).toBeInTheDocument()
      expect(confirmOffer).not.toHaveBeenCalled()

      fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
      await advance()

      expect(sourceInput()).toHaveValue('1000')
      expect(beneficiarySelect()).toHaveValue(atlas.id)
    })

    it('confirms exactly the displayed offer and opens the payment step with the PIX code', async () => {
      await renderPage()

      await goToPayment()

      expect(confirmOffer).toHaveBeenCalledWith(OFFER_ID, {
        sourceAmount: 1000,
        targetAmount: 182.45,
      })
      expect(screen.getByRole('status')).toHaveTextContent('Aguardando o seu pagamento')
      expect(screen.getByLabelText('Código PIX para pagamento (copia e cola)')).toHaveValue(
        '00020126580014br.gov.bcb.pix',
      )
      // O id da execução vai para a URL: recarregar retoma esta transferência.
      expect(currentSearch()).toBe(`?${EXECUTION_PARAM}=${EXECUTION_ID}`)
    })

    it('returns to Dados asking for a new quote when the backend rejects the offer', async () => {
      vi.mocked(confirmOffer).mockRejectedValueOnce(httpError(422))
      await renderPage()
      await goToReview()

      fireEvent.click(confirmButton())
      await advance()

      expect(
        screen.getByText('A cotação expirou ou mudou. Atualize a cotação e confirme novamente.'),
      ).toBeInTheDocument()
      expect(continueButton()).toBeDisabled()
    })

    it('stays on Revisão with a clear message when the user lacks permission', async () => {
      vi.mocked(confirmOffer).mockRejectedValueOnce(httpError(403))
      await renderPage()
      await goToReview()

      fireEvent.click(confirmButton())
      await advance()

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Você não tem permissão para realizar esta transferência.',
      )
      expect(confirmButton()).toBeEnabled()
    })

    it('does not confirm an offer that expired while the user was reviewing', async () => {
      await renderPage()
      await goToReview()

      await advance(60_000)

      expect(screen.queryByText('Revisão da transferência')).not.toBeInTheDocument()
      expect(
        screen.getByText('A cotação expirou ou mudou. Atualize a cotação e confirme novamente.'),
      ).toBeInTheDocument()
      expect(sourceInput()).toHaveValue('1000')
      expect(confirmOffer).not.toHaveBeenCalled()
    })
  })

  describe('Pagamento', () => {
    it('polls the execution until it completes and then stops', async () => {
      await renderPage()
      await goToPayment()

      await advance(EXECUTION_POLL_MS)

      expect(getTransferExecution).toHaveBeenCalledTimes(1)
      expect(getTransferExecution).toHaveBeenCalledWith(EXECUTION_ID, expect.any(AbortSignal))
      expect(screen.getByRole('status')).toHaveTextContent('Transferência concluída')

      await advance(EXECUTION_POLL_MS * 3)
      expect(getTransferExecution).toHaveBeenCalledTimes(1)
    })

    it('keeps polling after a temporary failure and tells the user', async () => {
      vi.mocked(getTransferExecution)
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(execution({ status: 'COMPLETED' }))
      await renderPage()
      await goToPayment()

      await advance(EXECUTION_POLL_MS)
      expect(screen.getByText(/Não foi possível atualizar o status agora/)).toBeInTheDocument()

      await advance(EXECUTION_POLL_MS)
      expect(getTransferExecution).toHaveBeenCalledTimes(2)
      expect(screen.getByRole('status')).toHaveTextContent('Transferência concluída')
    })

    it('asks to accept a requote and confirms the new displayed amounts', async () => {
      vi.mocked(confirmOffer).mockResolvedValueOnce(
        execution({
          status: 'REQUOTE_REQUIRED',
          fundingInstructions: null,
          requote: {
            source: { amount: 1000, currency: 'BRL' },
            target: { amount: 180.1, currency: 'USD' },
            expiresAt: null,
          },
        }),
      )
      await renderPage()
      await goToPayment()

      fireEvent.click(screen.getByRole('button', { name: 'Aceitar nova cotação' }))
      await advance()

      expect(confirmRequote).toHaveBeenCalledWith(EXECUTION_ID, {
        sourceAmount: 1000,
        targetAmount: 180.1,
      })
      expect(screen.getByRole('status')).toHaveTextContent('Pagamento recebido')
    })

    it('offers a new transfer once the execution ends', async () => {
      vi.mocked(confirmOffer).mockResolvedValueOnce(execution({ status: 'FAILED' }))
      await renderPage()
      await goToPayment()

      fireEvent.click(screen.getByRole('button', { name: 'Nova transferência' }))
      await advance()

      expect(sourceInput()).toHaveValue('')
      expect(currentSearch()).toBe('')
      expect(getTransferExecution).not.toHaveBeenCalled()
    })

    it('does not offer a new transfer while a tracked payment is pending', async () => {
      vi.mocked(getTransferExecution).mockResolvedValue(execution())
      await renderPage()
      await goToPayment()

      await advance(EXECUTION_POLL_MS)

      expect(screen.queryByRole('button', { name: 'Nova transferência' })).not.toBeInTheDocument()
    })

    it('shows the TED bank details instead of a PIX code', async () => {
      vi.mocked(confirmOffer).mockResolvedValueOnce(
        execution({
          fundingMethod: 'TED',
          fundingInstructions: null,
          fundingBankTransfer: {
            memoCode: 'BP-MEMO-1',
            beneficiaryName: 'BlindPay, Inc.',
            beneficiaryAddress: null,
            bankName: 'Column NA',
            bankAddress: null,
            routingNumber: '121145349',
            accountNumber: '31254097',
            accountType: 'Business checking',
          },
        }),
      )
      await renderPage()
      await goToPayment()

      expect(screen.getByText('Dados para pagamento por TED')).toBeInTheDocument()
      expect(screen.getByText('Código de referência').nextSibling).toHaveTextContent('BP-MEMO-1')
      expect(screen.getByText('Conta').nextSibling).toHaveTextContent('31254097')
      expect(screen.getByText('Banco').nextSibling).toHaveTextContent('Column NA')
      expect(screen.queryByText('Endereço do banco')).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/Código PIX/)).not.toBeInTheDocument()
    })

    it('warns not to pay while the TED details are missing', async () => {
      vi.mocked(confirmOffer).mockResolvedValueOnce(
        execution({ fundingMethod: 'TED', fundingInstructions: null, fundingBankTransfer: null }),
      )
      await renderPage()
      await goToPayment()

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Os dados para a TED ainda não estão disponíveis. Não faça o pagamento',
      )
      expect(screen.queryByLabelText(/Código PIX/)).not.toBeInTheDocument()
    })

    it('warns not to pay while the PIX code is missing', async () => {
      vi.mocked(confirmOffer).mockResolvedValueOnce(execution({ fundingInstructions: null }))
      await renderPage()
      await goToPayment()

      expect(screen.getByRole('alert')).toHaveTextContent(
        'O código PIX ainda não está disponível. Não faça o pagamento',
      )
    })

    it('shows the Avenia PIX code without polling and allows another transfer without cancelling it', async () => {
      quote = offerFor(1000, 180.5, 'AVENIA')
      vi.mocked(confirmOffer).mockResolvedValueOnce(
        execution({ provider: 'AVENIA', fundingInstructions: 'avenia-br-code' }),
      )
      await renderPage()
      await goToPayment()

      await advance(EXECUTION_POLL_MS * 3)

      expect(getTransferExecution).not.toHaveBeenCalled()
      expect(screen.getByLabelText('Código PIX para pagamento (copia e cola)')).toHaveValue(
        'avenia-br-code',
      )
      expect(screen.getByText(/esta tela não acompanha o pagamento automaticamente/)).toBeVisible()
      expect(screen.getByText('Iniciar outra transferência não cancela esta.')).toBeVisible()
      expect(screen.getByRole('button', { name: 'Nova transferência' })).toBeEnabled()
    })
  })

  describe('retomada após recarregar a página', () => {
    it('given the execution in the URL, when the page loads, then it resumes the payment from the backend', async () => {
      vi.mocked(getTransferExecution).mockResolvedValueOnce(execution())

      await reloadWithExecution()

      expect(getTransferExecution).toHaveBeenCalledWith(EXECUTION_ID, expect.any(AbortSignal))
      expect(screen.getByRole('status')).toHaveTextContent('Aguardando o seu pagamento')
      expect(screen.getByLabelText('Código PIX para pagamento (copia e cola)')).toHaveValue(
        '00020126580014br.gov.bcb.pix',
      )
      expect(confirmOffer).not.toHaveBeenCalled()
      expect(createQuote).not.toHaveBeenCalled()
    })

    it('shows that it is loading instead of the empty form', async () => {
      vi.mocked(getTransferExecution).mockImplementationOnce(() => new Promise(() => {}))

      await reloadWithExecution()

      expect(screen.getByRole('status')).toHaveTextContent('Carregando a transferência...')
      expect(screen.queryByLabelText('Valor de origem*')).not.toBeInTheDocument()
    })

    it('reports a transfer of another company as not found and starts a clean transfer', async () => {
      vi.mocked(getTransferExecution).mockRejectedValueOnce(httpError(404))

      await reloadWithExecution()

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Transferência não encontrada para a sua empresa.',
      )
      fireEvent.click(screen.getByRole('button', { name: 'Nova transferência' }))
      await advance()

      expect(currentSearch()).toBe('')
      expect(sourceInput()).toHaveValue('')
    })

    it('retries loading after a temporary failure', async () => {
      vi.mocked(getTransferExecution)
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(execution({ status: 'COMPLETED' }))
      await reloadWithExecution()

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Não foi possível carregar a transferência. Tente novamente.',
      )
      fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
      await advance()

      expect(getTransferExecution).toHaveBeenCalledTimes(2)
      expect(screen.getByRole('status')).toHaveTextContent('Transferência concluída')
    })

    it('rejects an invalid link without calling the backend', async () => {
      await reloadWithExecution('not-a-uuid')

      expect(screen.getByRole('alert')).toHaveTextContent('O link desta transferência é inválido.')
      expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
      expect(getTransferExecution).not.toHaveBeenCalled()
    })
  })

  describe('trava de 48h após redefinir o 2FA', () => {
    it('shows the banner and blocks Continuar while the lock is active', async () => {
      vi.mocked(useSession).mockReturnValue(
        sessionUser(new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()),
      )

      await renderPage()

      const banner = screen.getAllByRole('alert')[0]!
      expect(banner).toHaveTextContent(
        'transferências estão temporariamente bloqueadas por 48 horas',
      )
      expect(banner).toHaveTextContent('Bloqueio ativo até:')
      await fillStep0()
      expect(continueButton()).toBeDisabled()
    })

    it('ignores a lock left in the browser by another account', async () => {
      localStorage.setItem(
        'vstable_withdrawal_locked_until',
        new Date(Date.now() + 3600000).toISOString(),
      )

      await renderPage()
      await fillStep0()

      expect(screen.queryByText(/temporariamente bloqueadas/i)).not.toBeInTheDocument()
      expect(continueButton()).toBeEnabled()
      localStorage.removeItem('vstable_withdrawal_locked_until')
    })

    it('does not block when the lock already expired', async () => {
      vi.mocked(useSession).mockReturnValue(
        sessionUser(new Date(Date.now() - 3600000).toISOString()),
      )

      await renderPage()
      await fillStep0()

      expect(screen.queryByText(/temporariamente bloqueadas/i)).not.toBeInTheDocument()
      expect(continueButton()).toBeEnabled()
    })
  })
})
