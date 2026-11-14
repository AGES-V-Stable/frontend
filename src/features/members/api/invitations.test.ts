import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/shared/http/httpClient'
import {
  createInvitation,
  getInvitationLink,
  regenerateInvitationLink,
  revokeInvitation,
} from './invitations'

const invitation = {
  id: 'i/1',
  companyId: 'c/1',
  name: 'Bruno Alves',
  email: 'bruno@empresa.com',
  role: 'VIEWER',
  status: 'PENDING',
  version: 2,
  createdBy: { id: 'u-1', name: 'Marina Costa' },
  createdAt: '2026-11-02T12:00:00Z',
  acceptedAt: null,
  revokedAt: null,
}
const generated = {
  invitation,
  inviteUrl: 'https://app.example/convites/empresa#token=opaque-token',
}
const ok = (body: unknown, status = 200) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
const headerOf = (init: RequestInit, name: string) =>
  new Headers(init.headers as Record<string, string>).get(name)

afterEach(() => vi.unstubAllGlobals())

describe('invitations API', () => {
  it('creates an invitation with only name, e-mail and role, without browser cache', async () => {
    // Arrange
    const fetchMock = ok(generated, 201)
    vi.stubGlobal('fetch', fetchMock)
    // Act
    const result = await createInvitation('c/1', {
      name: 'Bruno Alves',
      email: 'bruno@empresa.com',
      role: 'VIEWER',
    })
    // Assert
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/v1/companies/c%2F1/invitations')
    expect(init.method).toBe('POST')
    expect(init.cache).toBe('no-store')
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'Bruno Alves',
      email: 'bruno@empresa.com',
      role: 'VIEWER',
    })
    expect(result.inviteUrl).toBe(generated.inviteUrl)
    expect(result.invitation).toMatchObject({ id: 'i/1', version: 2, status: 'PENDING' })
  })

  it('reads the current link with GET, no body and no If-Match', async () => {
    // Arrange
    const fetchMock = ok(generated)
    vi.stubGlobal('fetch', fetchMock)
    // Act
    const result = await getInvitationLink('c/1', 'i/1')
    // Assert
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/v1/companies/c%2F1/invitations/i%2F1/link')
    expect(init.method).toBeUndefined()
    expect(init.body).toBeUndefined()
    expect(init.cache).toBe('no-store')
    expect(headerOf(init, 'If-Match')).toBeNull()
    expect(result.inviteUrl).toBe(generated.inviteUrl)
  })

  it('regenerates the link with the listed version in If-Match and returns the new version', async () => {
    // Arrange
    const fetchMock = ok({
      invitation: { ...invitation, version: 3 },
      inviteUrl: 'https://app.example/convites/empresa#token=new-token',
    })
    vi.stubGlobal('fetch', fetchMock)
    // Act
    const result = await regenerateInvitationLink('c/1', { id: 'i/1', version: 2 })
    // Assert
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/v1/companies/c%2F1/invitations/i%2F1/regenerate')
    expect(init.method).toBe('POST')
    expect(init.body).toBeUndefined()
    expect(headerOf(init, 'If-Match')).toBe('"2"')
    expect(result.invitation.version).toBe(3)
    expect(result.inviteUrl).toContain('new-token')
  })

  it('revokes with DELETE and If-Match, accepting the 204 without body', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    // Act
    await revokeInvitation('c1', { id: 'i-1', version: 4 })
    // Assert
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/v1/companies/c1/invitations/i-1')
    expect(init.method).toBe('DELETE')
    expect(init.body).toBeUndefined()
    expect(headerOf(init, 'If-Match')).toBe('"4"')
  })

  it.each([
    ['a link with a non-web protocol', { ...generated, inviteUrl: 'javascript:alert(1)' }],
    ['a missing link', { invitation }],
    ['an invitation outside the contract', { ...generated, invitation: { id: 'i-1' } }],
  ])('rejects %s', async (_, body) => {
    vi.stubGlobal('fetch', ok(body))
    await expect(getInvitationLink('c1', 'i-1')).rejects.toThrow()
  })

  it('preserves the backend code and details of a duplicate invitation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'INVITATION_ALREADY_EXISTS',
            message: 'Já existe',
            details: { invitationId: 'i-9' },
          }),
          { status: 409 },
        ),
      ),
    )
    const error = await createInvitation('c1', {
      name: 'Bruno',
      email: 'bruno@empresa.com',
      role: 'OPERATOR',
    }).catch((cause: unknown) => cause)
    expect(error).toBeInstanceOf(HttpError)
    expect(error).toMatchObject({
      status: 409,
      code: 'INVITATION_ALREADY_EXISTS',
      body: { details: { invitationId: 'i-9' } },
    })
  })

  it('exposes Retry-After of a rate-limited regeneration', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'INVITATION_RATE_LIMITED', message: 'Aguarde' }), {
          status: 429,
          headers: { 'Retry-After': '45' },
        }),
      ),
    )
    const error = await regenerateInvitationLink('c1', { id: 'i-1', version: 1 }).catch(
      (cause: unknown) => cause,
    )
    expect(error).toMatchObject({ status: 429, retryAfterSeconds: 45 })
  })
})
