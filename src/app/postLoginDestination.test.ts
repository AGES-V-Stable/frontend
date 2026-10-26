import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { postLoginDestination } from '@/app/postLoginDestination'
import { saveLoginToken } from '@/shared/http/authToken'
import { PATHS } from '@/shared/navigation/paths'

const adminToken = `header.${btoa(JSON.stringify({ account_type: 'ADMIN' }))}.signature`
const userToken = `header.${btoa(JSON.stringify({ account_type: 'USER' }))}.signature`
const onboarding = {
  kycVerificationId: 'kyc-1',
  companyId: 'c1',
  status: 'PENDING',
  documentSubmitted: true,
  livenessSubmitted: true,
}

function stubOnboarding(response: Response) {
  const fetcher = vi.fn(async () => response)
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

describe('postLoginDestination', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => vi.unstubAllGlobals())

  it('returns an admin to an administrative origin without querying the onboarding', async () => {
    saveLoginToken(adminToken)
    const fetcher = stubOnboarding(new Response('{}'))

    expect(await postLoginDestination(PATHS.ADMIN_TRANSFERS)).toBe(PATHS.ADMIN_TRANSFERS)
    expect(await postLoginDestination(PATHS.TRANSFERS)).toBe(PATHS.ADMIN_CLIENTS)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('resumes a representative at the pending liveness step', async () => {
    saveLoginToken(userToken)
    stubOnboarding(new Response(JSON.stringify({ ...onboarding, livenessSubmitted: false })))

    expect(await postLoginDestination(PATHS.TRANSFERS)).toBe('/register/kyc-1/compliance/liveness')
  })

  it('returns a user with a finished registration to the company origin', async () => {
    saveLoginToken(userToken)
    stubOnboarding(new Response(JSON.stringify({ ...onboarding, status: 'APPROVED' })))

    expect(await postLoginDestination(PATHS.TRANSFERS)).toBe(PATHS.TRANSFERS)
  })

  it('ignores an administrative origin for a company user', async () => {
    saveLoginToken(userToken)
    stubOnboarding(new Response('{}', { status: 404 }))

    expect(await postLoginDestination(PATHS.ADMIN_CLIENTS)).toBe(PATHS.HOME)
  })

  it('keeps the login going when the onboarding query fails', async () => {
    saveLoginToken(userToken)
    stubOnboarding(new Response('{}', { status: 500 }))

    expect(await postLoginDestination(null)).toBe(PATHS.HOME)
  })
})
