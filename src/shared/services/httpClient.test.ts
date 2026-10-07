import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { saveAccessToken } from './authToken'
import { HttpError, httpRequest } from './httpClient'

describe('httpClient', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends the request without an Authorization header when there is no access token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await httpRequest('/v1/example')

    const [, options] = fetchMock.mock.calls[0]!
    expect(options.headers).not.toHaveProperty('Authorization')
  })

  it('includes the Bearer token when one is stored', async () => {
    saveAccessToken('token-abc')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await httpRequest('/v1/example')

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/example',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-abc' }),
      }),
    )
  })

  it('returns undefined for a 204 No Content response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }))

    const result = await httpRequest('/v1/example')

    expect(result).toBeUndefined()
  })

  it('throws an HttpError with the status and body when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => 'not found' }),
    )

    await expect(httpRequest('/v1/example')).rejects.toMatchObject({
      status: 404,
      body: 'not found',
    })
  })

  it('is an instance of Error and HttpError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' }),
    )

    try {
      await httpRequest('/v1/example')
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(HttpError)
    }
  })
})
