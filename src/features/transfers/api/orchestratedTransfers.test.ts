import { beforeEach, describe, expect, it, vi } from 'vitest'
import { httpRequest } from '@/shared/http/httpClient'
import {
  confirmOffer,
  confirmRequote,
  getTransferExecution,
  requestOrchestratedQuote,
  requireTotp,
} from './orchestratedTransfers'

vi.mock('@/shared/http/httpClient', () => ({ httpRequest: vi.fn() }))

const http = vi.mocked(httpRequest)
const offerId = '277ba36d-ac63-4315-bb09-8a40fbd1b879'
const executionId = '49960b31-3ef9-486f-a1b7-2dac8436c9f1'
const amounts = { sourceAmount: 1000, targetAmount: 180.25 }

const execution = {
  executionId,
  offerId,
  transactionId: null,
  provider: 'BLINDPAY',
  status: 'AWAITING_FUNDS',
  source: { amount: 1000, currency: 'BRL' },
  target: { amount: 180.25, currency: 'USD' },
  totalFee: 2.5,
  fundingInstructions: '000201234',
  requote: null,
  failureCode: null,
  createdAt: '2026-11-14T16:00:00Z',
  updatedAt: '2026-11-14T16:00:01Z',
}

describe('orchestrated transfer API', () => {
  beforeEach(() => {
    http.mockReset()
  })


  it('requests the winner selected by the backend without starting any financial operation', async () => {
    const request = {
      beneficiaryId: offerId,
      direction: 'PAYOUT' as const,
      sourceCurrency: 'BRL' as const,
      targetCurrency: 'USD',
      sourcePaymentMethod: 'pix' as const,
      targetPaymentMethod: 'wire',
      amount: 1000,
      amountSide: 'SOURCE' as const,
      token: 'USDC',
      blockchainNetwork: 'polygon',
      coverFees: false,
    }
    const winningOffer = {
      quoteRequestId: executionId,
      offer: {
        offerId,
        provider: 'BLINDPAY',
        sourceAmount: 1000,
        targetAmount: 180.25,
        exchangeRate: 0.18025,
        totalFee: 2.5,
        expiresAt: '2099-01-01T00:00:00Z',
      },
    }
    http.mockResolvedValue(winningOffer)
    const result = await requestOrchestratedQuote(request)
    expect(result.offer).toEqual(winningOffer.offer)
    expect(http).toHaveBeenCalledTimes(1)
    expect(http).toHaveBeenCalledWith('/v1/quotes', {
      method: 'POST',
      body: JSON.stringify(request),
      signal: undefined,
    })
    expect(JSON.parse(String(http.mock.calls[0]![1]?.body))).not.toHaveProperty('totpCode')
  })

  it('does not allow a missing winner to be passed to the confirmation component', async () => {
    const request = {
      beneficiaryId: offerId,
      direction: 'PAYOUT' as const,
      sourceCurrency: 'BRL' as const,
      targetCurrency: 'USD',
      sourcePaymentMethod: 'pix' as const,
      targetPaymentMethod: 'wire',
      amount: 1000,
      amountSide: 'TARGET' as const,
      coverFees: true,
    }
    http.mockResolvedValue({ quoteRequestId: executionId, offer: null })
    await expect(requestOrchestratedQuote(request)).rejects.toThrow()
    expect(http).toHaveBeenCalledTimes(1)
  })

  it('rejects invalid TOTP before contacting a financial endpoint', async () => {
    expect(requireTotp('123456')).toBe('123456')
    for (const code of ['', '12345', '1234567', 'ABCD-1234']) {
      await expect(confirmOffer(offerId, amounts, code)).rejects.toThrow()
      await expect(confirmRequote(executionId, amounts, code)).rejects.toThrow()
    }
    expect(http).not.toHaveBeenCalled()
  })

  it('rejects invalid amounts before contacting the backend', async () => {
    const invalid = { sourceAmount: 0, targetAmount: 20 }
    await expect(confirmOffer(offerId, invalid, '123456')).rejects.toThrow()
    expect(http).not.toHaveBeenCalled()
  })

  it('confirms only the selected offer and accepted monetary values', async () => {
    http.mockResolvedValue(execution)
    const result = await confirmOffer(offerId, amounts, '123456')
    expect(result.status).toBe('AWAITING_FUNDS')

    const [url, options] = http.mock.calls[0]!
    expect(url).toBe(`/v1/quotes/offers/${offerId}/confirm`)
    expect(options?.method).toBe('POST')
    expect(JSON.parse(String(options?.body))).toEqual({
      ...amounts,
      totpCode: '123456',
    })
    expect(http).toHaveBeenCalledTimes(1)
  })

  it('reads the execution state without resubmitting a payment', async () => {
    http.mockResolvedValue(execution)
    const result = await getTransferExecution(executionId)
    expect(result.status).toBe('AWAITING_FUNDS')
    expect(http).toHaveBeenCalledWith(`/v1/transfer-executions/${executionId}`)
  })

  it('accepts a requote with a separately provided six-digit code', async () => {
    http.mockResolvedValue({ ...execution, status: 'PAYOUT_PROCESSING' })
    const accepted = { sourceAmount: 1000, targetAmount: 175 }
    await confirmRequote(executionId, accepted, '654321')

    const [url, options] = http.mock.calls[0]!
    expect(url).toBe(`/v1/transfer-executions/${executionId}/requote/confirm`)
    expect(JSON.parse(String(options?.body))).toEqual({
      ...accepted,
      totpCode: '654321',
    })
  })

  it('rejects incomplete execution responses', async () => {
    http.mockResolvedValue({ ...execution, executionId: undefined })
    await expect(confirmOffer(offerId, amounts, '123456')).rejects.toThrow()
  })

  it('rejects malformed resource IDs before sending requests', async () => {
    await expect(getTransferExecution('../other-company')).rejects.toThrow()
    await expect(confirmOffer('wrong-id', amounts, '123456')).rejects.toThrow()
    expect(http).not.toHaveBeenCalled()
  })
})
