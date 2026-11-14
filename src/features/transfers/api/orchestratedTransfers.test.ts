import { beforeEach, describe, expect, it, vi } from 'vitest'
import { httpRequest } from '@/shared/http/httpClient'
import {
  confirmOffer,
  confirmRequote,
  getTransferExecution,
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
  beforeEach(() => http.mockReset())

  it('rejects invalid or missing TOTP before any financial request', async () => {
    expect(() => requireTotp('123456')).not.toThrow()
    for (const code of ['', '12345', '1234567', 'ABCD-1234', '12x456']) {
      await expect(confirmOffer(offerId, amounts, code)).rejects.toThrow()
      await expect(confirmRequote(executionId, amounts, code)).rejects.toThrow()
    }
    expect(http).not.toHaveBeenCalled()
  })

  it('does not submit invalid confirmation amounts', async () => {
    await expect(
      confirmOffer(offerId, { sourceAmount: 0, targetAmount: 20 }, '123456'),
    ).rejects.toThrow()
    await expect(
      confirmOffer(offerId, { sourceAmount: 10, targetAmount: Number.NaN }, '123456'),
    ).rejects.toThrow()
    expect(http).not.toHaveBeenCalled()
  })

  it('posts confirmed values and the six-digit code to the exact endpoint', async () => {
    http.mockResolvedValue(execution)
    await expect(confirmOffer(offerId, amounts, '123456')).resolves.toMatchObject(execution)
    expect(http).toHaveBeenCalledExactlyOnceWith(
      `/v1/quotes/offers/${offerId}/confirm`,
      {
        method: 'POST',
        body: JSON.stringify({ ...amounts, totpCode: '123456' }),
      },
    )
  })

  it('fetches execution state using the authenticated transport', async () => {
    http.mockResolvedValue(execution)
    await expect(getTransferExecution(executionId)).resolves.toMatchObject(execution)
    expect(http).toHaveBeenCalledWith(`/v1/transfer-executions/${executionId}`)
  })

  it('confirms a requote with a separate TOTP code and the accepted new amounts', async () => {
    http.mockResolvedValue({ ...execution, status: 'PAYOUT_PROCESSING' })
    await confirmRequote(executionId, { sourceAmount: 1000, targetAmount: 175 }, '654321')
    expect(http).toHaveBeenCalledWith(
      `/v1/transfer-executions/${executionId}/requote/confirm`,
      {
        method: 'POST',
        body: JSON.stringify({ sourceAmount: 1000, targetAmount: 175, totpCode: '654321' }),
      },
    )
  })

  it('does not accept incomplete execution data or fabricate a successful state', async () => {
    http.mockResolvedValue({ ...execution, status: 'COMPLETED', executionId: undefined })
    await expect(confirmOffer(offerId, amounts, '123456')).rejects.toThrow()
  })

  it('requires UUIDs on resource paths', async () => {
    await expect(getTransferExecution('../other-company')).rejects.toThrow()
    await expect(confirmOffer('bad-offer', amounts, '123456')).rejects.toThrow()
    expect(http).not.toHaveBeenCalled()
  })
})
