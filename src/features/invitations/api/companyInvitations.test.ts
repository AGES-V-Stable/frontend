import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveLoginToken } from '@/shared/http/authToken'
import {
  acceptedMember,
  apiError,
  INVITATION_TOKEN,
  json,
  newUserAcceptance,
  requestsTo,
  resolvedInvitation,
  stubApi,
  userJwt,
} from '@/test/fixtures/companyInvitation'
import {
  acceptInvitation,
  acceptInvitationAsNewUser,
  resolveInvitation,
} from './companyInvitations'

const RESOLVE = 'POST /v1/company-invitations/resolve'
const ACCEPT_NEW = 'POST /v1/company-invitations/accept-new-user'
const ACCEPT = 'POST /v1/company-invitations/accept'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('resolveInvitation', () => {
  it('sends the token only in the body of a public request and validates the response', async () => {
    saveLoginToken(userJwt)
    const fetchMock = stubApi({ [RESOLVE]: json(resolvedInvitation) })

    await expect(resolveInvitation(INVITATION_TOKEN)).resolves.toEqual(resolvedInvitation)

    const [request] = requestsTo(fetchMock, RESOLVE)
    expect(request.body).toEqual({ token: INVITATION_TOKEN })
    expect(request.headers).not.toHaveProperty('Authorization')
    expect(fetchMock.mock.calls[0][0]).not.toContain(INVITATION_TOKEN)
  })

  it('rejects a response outside the contract', async () => {
    stubApi({ [RESOLVE]: json({ ...resolvedInvitation, acceptanceMode: 'AUTO' }) })
    await expect(resolveInvitation(INVITATION_TOKEN)).rejects.toThrow()
  })

  it('preserves the contract error code', async () => {
    stubApi({ [RESOLVE]: apiError(410, 'INVITATION_REVOKED') })
    await expect(resolveInvitation(INVITATION_TOKEN)).rejects.toMatchObject({
      status: 410,
      code: 'INVITATION_REVOKED',
    })
  })
})

describe('acceptInvitationAsNewUser', () => {
  it('sends only token, password, confirmation and terms, never identity or role overrides', async () => {
    saveLoginToken(userJwt)
    const fetchMock = stubApi({ [ACCEPT_NEW]: json(newUserAcceptance, { status: 201 }) })

    await expect(
      acceptInvitationAsNewUser({
        token: INVITATION_TOKEN,
        password: 'Segura123!',
        confirmPassword: 'Segura123!',
        termsVersion: 'v1',
      }),
    ).resolves.toEqual(newUserAcceptance)

    const [request] = requestsTo(fetchMock, ACCEPT_NEW)
    expect(request.body).toEqual({
      token: INVITATION_TOKEN,
      password: 'Segura123!',
      confirmPassword: 'Segura123!',
      termsAccepted: true,
      termsVersion: 'v1',
    })
    expect(request.headers).not.toHaveProperty('Authorization')
  })

  it('rejects a response that would skip the normal login', async () => {
    stubApi({ [ACCEPT_NEW]: json({ ...newUserAcceptance, nextAction: 'DASHBOARD' }) })
    await expect(
      acceptInvitationAsNewUser({
        token: INVITATION_TOKEN,
        password: 'Segura123!',
        confirmPassword: 'Segura123!',
        termsVersion: 'v1',
      }),
    ).rejects.toThrow()
  })
})

describe('acceptInvitation', () => {
  it('confirms with the session JWT and returns the member', async () => {
    saveLoginToken(userJwt)
    const fetchMock = stubApi({ [ACCEPT]: json(acceptedMember) })

    await expect(
      acceptInvitation({ token: INVITATION_TOKEN, termsVersion: 'v1' }),
    ).resolves.toEqual(acceptedMember)

    const [request] = requestsTo(fetchMock, ACCEPT)
    expect(request.body).toEqual({
      token: INVITATION_TOKEN,
      termsAccepted: true,
      termsVersion: 'v1',
    })
    expect(request.headers.Authorization).toBe(`Bearer ${userJwt}`)
  })
})
