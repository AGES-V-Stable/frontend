import { beforeEach, describe, expect, it, vi } from 'vitest'
import { httpRequest } from '@/shared/http/httpClient'
import {
  captureIndividualTermsReturn,
  checkIndividualTermsReturn,
  startIndividualKycTerms,
} from './blindpayIndividualKyc'

vi.mock('@/shared/http/httpClient', () => ({ httpRequest: vi.fn() }))

const state = '00000000-0000-4000-8000-000000000001'

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
})

describe('manual terms confirmation', () => {
  it('checks the scoped hosted return only when requested and clears it after success', async () => {
    captureIndividualTermsReturn(`?state=${state}&tos_id=to_000000000001`)
    expect(httpRequest).not.toHaveBeenCalled()

    await checkIndividualTermsReturn()

    expect(httpRequest).toHaveBeenCalledWith('/v1/blindpay/kyc/terms/confirm', {
      method: 'POST',
      body: JSON.stringify({ state, tosId: 'to_000000000001' }),
    })
    vi.mocked(httpRequest).mockClear()
    await checkIndividualTermsReturn()
    expect(httpRequest).not.toHaveBeenCalled()
  })

  it('ignores an invalid or unscoped return', async () => {
    captureIndividualTermsReturn('?tos_id=to_000000000001')
    captureIndividualTermsReturn('?state=invalid&tos_id=to_000000000001')

    await checkIndividualTermsReturn()

    expect(httpRequest).not.toHaveBeenCalled()
  })

  it('preserves the return when confirmation fails so the user can retry', async () => {
    captureIndividualTermsReturn(`?state=${state}&tos_id=to_000000000001`)
    vi.mocked(httpRequest).mockRejectedValueOnce(new Error('Unavailable'))
    await expect(checkIndividualTermsReturn()).rejects.toThrow('Unavailable')

    await checkIndividualTermsReturn()

    expect(httpRequest).toHaveBeenCalledTimes(2)
  })

  it('records the session from a trusted generated link', async () => {
    const url = `https://app.blindpay.com/e/terms-of-service?idempotency_key=${state}`
    vi.mocked(httpRequest).mockResolvedValue({ url })

    await expect(startIndividualKycTerms()).resolves.toBe(url)

    expect(localStorage.getItem('vstable:blindpay:terms:session')).toBe(state)
  })
})
