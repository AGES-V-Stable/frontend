import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { QuoteOffer } from '@/types/quote'
import { HttpError } from '@/shared/http/httpClient'
import {
  confirmOffer,
  confirmRequote,
  getTransferExecution,
} from '@/features/transfers/api/orchestratedTransfers'
import { OrchestratedOfferConfirmation } from './OrchestratedOfferConfirmation'

vi.mock('@/features/transfers/api/orchestratedTransfers', () => ({
  confirmOffer: vi.fn(),
  confirmRequote: vi.fn(),
  getTransferExecution: vi.fn(),
}))

vi.mock('@/shared/components/TwoFactorAuth', () => ({
  TwoFactorAuthContainer: ({
    onVerify,
    onBack,
    loading,
  }: {
    onVerify: (code: string) => void
    onBack: () => void
    loading?: boolean
  }) => (
    <div>
      <button type="button" disabled={loading} onClick={() => onVerify('123456')}>
        Autorizar 123456
      </button>
      <button type="button" disabled={loading} onClick={() => onVerify('654321')}>
        Autorizar 654321
      </button>
      <button type="button" onClick={onBack}>
        Voltar
      </button>
    </div>
  ),
}))

const offer: QuoteOffer = {
  offerId: '277ba36d-ac63-4315-bb09-8a40fbd1b879',
  sourceAmount: 1000,
  targetAmount: 180.25,
  exchangeRate: 0.18025,
  totalFee: 2.5,
  expiresAt: '2099-11-14T16:00:00Z',
}

const execution = {
  executionId: '49960b31-3ef9-486f-a1b7-2dac8436c9f1',
  offerId: offer.offerId,
  transactionId: null,
  provider: 'BLINDPAY',
  status: 'AWAITING_FUNDS',
  source: { amount: 1000, currency: 'BRL' },
  target: { amount: 180.25, currency: 'USD' },
  totalFee: 2.5,
  fundingInstructions: '000201',
  requote: null,
  failureCode: null,
  createdAt: '2026-11-14T16:00:00Z',
  updatedAt: '2026-11-14T16:00:01Z',
} as const

const confirm = vi.mocked(confirmOffer)
const requote = vi.mocked(confirmRequote)
const getExecution = vi.mocked(getTransferExecution)

describe('OrchestratedOfferConfirmation', () => {
  beforeEach(() => {
    confirm.mockReset()
    requote.mockReset()
    getExecution.mockReset()
  })

  it('keeps a disabled financial action inaccessible', () => {
    render(<OrchestratedOfferConfirmation offer={offer} disabled />)
    expect(screen.getByRole('button', { name: 'Confirmar oferta' })).toBeDisabled()
    expect(confirm).not.toHaveBeenCalled()
  })

  it('prevents confirming expired offers', () => {
    render(
      <OrchestratedOfferConfirmation offer={{ ...offer, expiresAt: '2020-01-01T00:00:00Z' }} />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('expirou')
    expect(screen.queryByRole('button', { name: 'Confirmar oferta' })).not.toBeInTheDocument()
    expect(confirm).not.toHaveBeenCalled()
  })

  it('sends one authorized confirmation with amounts actually shown to the user', async () => {
    confirm.mockResolvedValue(execution)
    render(<OrchestratedOfferConfirmation offer={offer} />)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar oferta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Autorizar 123456' }))
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1))
    expect(confirm).toHaveBeenCalledWith(
      offer.offerId,
      { sourceAmount: 1000, targetAmount: 180.25 },
      '123456',
    )
    expect(await screen.findByText(/AWAITING_FUNDS/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Confirmar oferta' })).not.toBeInTheDocument()
  })

  it('on ambiguous failure never retries automatically', async () => {
    confirm.mockRejectedValue(new Error('network timeout'))
    render(<OrchestratedOfferConfirmation offer={offer} />)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar oferta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Autorizar 123456' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não envie outra confirmação')
    expect(screen.getByRole('status')).toHaveTextContent('Nova autorização bloqueada')
    expect(screen.getByRole('button', { name: 'Confirmar oferta' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Autorizar 654321' })).not.toBeInTheDocument()
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(requote).not.toHaveBeenCalled()
  })

  it('blocks a second confirmation after a 502 from the provider, but not after invalid TOTP', async () => {
    confirm.mockRejectedValueOnce(new HttpError('upstream status unknown', 502))
    render(<OrchestratedOfferConfirmation offer={offer} />)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar oferta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Autorizar 123456' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Nova autorização bloqueada')
    expect(screen.getByRole('button', { name: 'Confirmar oferta' })).toBeDisabled()
    expect(confirm).toHaveBeenCalledTimes(1)
  })

  it('reports an already used TOTP without exposing server details', async () => {
    confirm.mockRejectedValue(new HttpError('provider secret', 401, {}, 'INVALID_2FA_CODE'))
    render(<OrchestratedOfferConfirmation offer={offer} />)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar oferta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Autorizar 123456' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('TOTP incorreto')
    expect(screen.queryByText('provider secret')).not.toBeInTheDocument()
  })

  it('refreshes an execution without repeating a financial confirmation', async () => {
    confirm.mockResolvedValue(execution)
    getExecution.mockResolvedValue({ ...execution, status: 'COMPLETED' })
    render(<OrchestratedOfferConfirmation offer={offer} />)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar oferta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Autorizar 123456' }))
    await screen.findByText(/AWAITING_FUNDS/)
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar estado' }))
    expect(await screen.findByText(/COMPLETED/)).toBeVisible()
    expect(getExecution).toHaveBeenCalledWith(execution.executionId)
    expect(confirm).toHaveBeenCalledTimes(1)
  })

  it('never sends a financial request when the requote already expired', async () => {
    confirm.mockResolvedValue({
      ...execution,
      status: 'REQUOTE_REQUIRED',
      requote: {
        source: { amount: 1000, currency: 'BRL' },
        target: { amount: 175, currency: 'USD' },
        expiresAt: '2020-01-01T00:00:00Z',
      },
    })
    render(<OrchestratedOfferConfirmation offer={offer} />)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar oferta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Autorizar 123456' }))
    await screen.findByText(/REQUOTE_REQUIRED/)
    await userEvent.click(screen.getByRole('button', { name: 'Aceitar nova cotação' }))
    await userEvent.click(screen.getByRole('button', { name: 'Autorizar 654321' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('expirou')
    expect(requote).not.toHaveBeenCalled()
  })

  it('does not repeat a payment when refreshing execution status fails', async () => {
    confirm.mockResolvedValue(execution)
    getExecution.mockRejectedValue(new Error('connection lost'))
    render(<OrchestratedOfferConfirmation offer={offer} />)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar oferta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Autorizar 123456' }))
    await screen.findByText(/AWAITING_FUNDS/)
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar estado' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('não será repetida')
    expect(confirm).toHaveBeenCalledTimes(1)
  })

  it('requires explicit fresh confirmation for a worse payout quote', async () => {
    const changed = {
      ...execution,
      status: 'REQUOTE_REQUIRED' as const,
      requote: {
        source: { amount: 1000, currency: 'BRL' },
        target: { amount: 175, currency: 'USD' },
        expiresAt: '2099-11-14T16:00:00Z',
      },
    }
    confirm.mockResolvedValue(changed)
    requote.mockResolvedValue({ ...execution, status: 'PAYOUT_PROCESSING' })
    render(<OrchestratedOfferConfirmation offer={offer} />)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar oferta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Autorizar 123456' }))
    await screen.findByText(/REQUOTE_REQUIRED/)
    await userEvent.click(screen.getByRole('button', { name: 'Aceitar nova cotação' }))
    await userEvent.click(screen.getByRole('button', { name: 'Autorizar 654321' }))
    expect(await screen.findByText(/PAYOUT_PROCESSING/)).toBeVisible()
    expect(requote).toHaveBeenCalledWith(
      execution.executionId,
      { sourceAmount: 1000, targetAmount: 175 },
      '654321',
    )
  })
})
