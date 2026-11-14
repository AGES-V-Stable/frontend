import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/shared/http/httpClient'
import {
  getMembers,
  getOwnMember,
  removeMember,
  updateMemberRole,
  versionFromEtag,
} from './members'

const member = {
  id: 'm-2',
  userId: 'u-2',
  companyId: 'c/1',
  name: 'Ana Souza',
  email: 'ana@empresa.com',
  role: 'OPERATOR',
  status: 'ACTIVE',
  version: 3,
  joinedAt: '2026-11-01T12:00:00Z',
  removedAt: null,
}
const list = {
  items: [
    { kind: 'MEMBER', member },
    {
      kind: 'INVITATION',
      invitation: {
        id: 'i-1',
        companyId: 'c/1',
        name: 'Bruno Lima',
        email: 'bruno@empresa.com',
        role: 'VIEWER',
        status: 'PENDING',
        version: 1,
        createdBy: { id: 'u-1', name: 'Marina' },
        createdAt: '2026-11-02T12:00:00Z',
        acceptedAt: null,
        revokedAt: null,
      },
    },
  ],
  page: 0,
  size: 20,
  totalElements: 2,
  totalPages: 1,
  summary: { activeMembers: 1, pendingInvitations: 1, peopleCount: 2 },
}

const headerOf = (init: RequestInit, name: string) =>
  new Headers(init.headers as Record<string, string>).get(name)

afterEach(() => vi.unstubAllGlobals())

describe('members API', () => {
  it('lists members and invitations of the company with the encoded id and page', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(list)))
    vi.stubGlobal('fetch', fetchMock)
    // Act
    const result = await getMembers('c/1', 2)
    // Assert
    expect(fetchMock.mock.calls[0][0]).toBe('/v1/companies/c%2F1/members?page=2&size=20')
    expect(result.items).toHaveLength(2)
    expect(result.summary.peopleCount).toBe(2)
  })

  it('rejects a list that does not match the contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...list, items: [{ kind: 'X' }] }))),
    )
    await expect(getMembers('c1')).rejects.toThrow()
  })

  it('loads only the own membership with an encoded company id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(member)))
    vi.stubGlobal('fetch', fetchMock)

    const result = await getOwnMember('c/1')

    expect(fetchMock.mock.calls[0][0]).toBe('/v1/companies/c%2F1/members/me')
    expect(result).toMatchObject({ id: 'm-2', role: 'OPERATOR', status: 'ACTIVE' })
  })

  it('rejects an invalid own-membership response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...member, role: 'ADMIN' }))),
    )
    await expect(getOwnMember('c1')).rejects.toThrow()
  })

  it('sends only the new role with the listed version in If-Match and keeps the ETag version', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...member, role: 'VIEWER', version: 4 }), {
        headers: { ETag: '"4"' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    // Act
    const updated = await updateMemberRole('c/1', { id: 'm/2', version: 3 }, 'VIEWER')
    // Assert
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/v1/companies/c%2F1/members/m%2F2')
    expect(init.method).toBe('PATCH')
    expect(headerOf(init, 'If-Match')).toBe('"3"')
    expect(JSON.parse(init.body as string)).toEqual({ role: 'VIEWER' })
    expect(updated).toMatchObject({ role: 'VIEWER', version: 4 })
  })

  it('falls back to the body version when the ETag is not exposed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...member, version: 5 }))),
    )
    await expect(updateMemberRole('c1', member, 'OPERATOR')).resolves.toMatchObject({ version: 5 })
  })

  it('rejects an updated member outside the contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...member, role: 'ADMIN' }))),
    )
    await expect(updateMemberRole('c1', member, 'VIEWER')).rejects.toThrow()
  })

  it('removes the membership with DELETE, If-Match and no body', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    // Act
    await removeMember('c1', { id: 'm-2', version: 7 })
    // Assert
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/v1/companies/c1/members/m-2')
    expect(init.method).toBe('DELETE')
    expect(init.body).toBeUndefined()
    expect(headerOf(init, 'If-Match')).toBe('"7"')
  })

  it('preserves the backend error code of a version conflict', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'RESOURCE_VERSION_MISMATCH', message: 'Versão' }), {
          status: 412,
        }),
      ),
    )
    const error = await removeMember('c1', member).catch((cause: unknown) => cause)
    expect(error).toBeInstanceOf(HttpError)
    expect(error).toMatchObject({ status: 412, code: 'RESOURCE_VERSION_MISMATCH' })
  })
})

describe('versionFromEtag', () => {
  it.each([
    ['"3"', 3],
    ['W/"12"', 12],
    [' "8" ', 8],
    ['3', null],
    ['"abc"', null],
    [null, null],
  ])('reads %s as %s', (etag, expected) => {
    expect(versionFromEtag(etag)).toBe(expected)
  })
})
