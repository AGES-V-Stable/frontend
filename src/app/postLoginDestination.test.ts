import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { postLoginDestination } from '@/app/postLoginDestination'
import { saveLoginToken } from '@/shared/http/authToken'
import { PATHS } from '@/shared/navigation/paths'
import { userWithMembership, userWithoutCompany } from '@/test/fixtures/companyInvitation'

const adminToken = `header.${btoa(JSON.stringify({ account_type: 'ADMIN' }))}.signature`
const userToken = `header.${btoa(JSON.stringify({ account_type: 'USER' }))}.signature`
const onboarding = {
  kycVerificationId: 'kyc-1',
  companyId: 'c1',
  status: 'PENDING',
  documentSubmitted: true,
  livenessSubmitted: true,
}

/** Responde `/v1/users/me` e a consulta do onboarding de forma independente. */
function stubApi({
  onboarding: onboardingResponse,
  me = () => new Response('{}', { status: 500 }),
}: {
  onboarding: () => Response
  me?: () => Response
}) {
  const fetcher = vi.fn(async (url: string) =>
    url === '/v1/users/me' ? me() : onboardingResponse(),
  )
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
    const fetcher = stubApi({ onboarding: () => new Response('{}') })

    expect(await postLoginDestination(PATHS.ADMIN_TRANSFERS)).toBe(PATHS.ADMIN_TRANSFERS)
    expect(await postLoginDestination(PATHS.TRANSFERS)).toBe(PATHS.ADMIN_CLIENTS)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('resumes a representative at the pending liveness step', async () => {
    saveLoginToken(userToken)
    stubApi({
      onboarding: () => new Response(JSON.stringify({ ...onboarding, livenessSubmitted: false })),
      me: () => new Response(JSON.stringify(userWithoutCompany)),
    })

    expect(await postLoginDestination(PATHS.TRANSFERS)).toBe('/register/kyc-1/compliance/liveness')
  })

  it('returns a user with a finished registration to the company origin', async () => {
    saveLoginToken(userToken)
    stubApi({
      onboarding: () => new Response(JSON.stringify({ ...onboarding, status: 'APPROVED' })),
    })

    expect(await postLoginDestination(PATHS.TRANSFERS)).toBe(PATHS.TRANSFERS)
  })

  it('ignores an administrative origin for a company user', async () => {
    saveLoginToken(userToken)
    stubApi({ onboarding: () => new Response('{}', { status: 404 }) })

    expect(await postLoginDestination(PATHS.ADMIN_CLIENTS)).toBe(PATHS.HOME)
  })

  it('keeps the login going when the onboarding query fails', async () => {
    saveLoginToken(userToken)
    stubApi({ onboarding: () => new Response('{}', { status: 500 }) })

    expect(await postLoginDestination(null)).toBe(PATHS.HOME)
  })

  it.each([
    ['company user', userToken],
    ['administrator', adminToken],
  ])(
    'returns a %s to the invitation to confirm it, before any onboarding redirect',
    async (_profile, token) => {
      saveLoginToken(token)
      const fetcher = stubApi({
        onboarding: () => new Response(JSON.stringify({ ...onboarding, livenessSubmitted: false })),
      })

      expect(await postLoginDestination(PATHS.COMPANY_INVITATION)).toBe(PATHS.COMPANY_INVITATION)
      expect(fetcher).not.toHaveBeenCalled()
    },
  )

  it('does not send an active invited member to the individual KYC wizard', async () => {
    saveLoginToken(userToken)
    const fetcher = stubApi({
      onboarding: () => new Response(JSON.stringify({ ...onboarding, livenessSubmitted: false })),
      me: () => new Response(JSON.stringify(userWithMembership)),
    })

    expect(await postLoginDestination(PATHS.MEMBERS)).toBe(PATHS.MEMBERS)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('keeps the onboarding check for the company owner', async () => {
    saveLoginToken(userToken)
    const owner = {
      ...userWithMembership,
      companyAccess: { ...userWithMembership.companyAccess, role: 'OWNER' },
    }
    stubApi({
      onboarding: () => new Response(JSON.stringify({ ...onboarding, livenessSubmitted: false })),
      me: () => new Response(JSON.stringify(owner)),
    })

    expect(await postLoginDestination(null)).toBe('/register/kyc-1/compliance/liveness')
  })
})
