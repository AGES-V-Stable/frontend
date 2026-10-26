import { afterEach, expect, it, vi } from 'vitest'
import { httpRequest, httpResponse, apiUrl, HttpError } from './httpClient'
import { saveLoginToken, saveAccessToken, getLoginToken, getAccessToken } from './authToken'
afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})
it('uses a same-origin complete API path by default', () =>
  expect(apiUrl('/api/transferencias/x')).toBe('/api/transferencias/x'))
it('merges Headers and authenticates JSON requests', async () => {
  saveLoginToken('login')
  const mock = vi.fn().mockResolvedValue(new Response('{"id":"x"}'))
  vi.stubGlobal('fetch', mock)
  expect(
    await httpRequest('/v1/example', {
      method: 'POST',
      body: '{}',
      headers: new Headers({ Accept: 'application/json' }),
    }),
  ).toEqual({ id: 'x' })
  expect(mock.mock.calls[0][1].headers).toEqual({
    Accept: 'application/json',
    Authorization: 'Bearer login',
    'Content-Type': 'application/json',
  })
})
it('distinguishes onboarding and login credentials', async () => {
  saveLoginToken('login')
  saveAccessToken('onboarding')
  const mock = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}')))
  vi.stubGlobal('fetch', mock)
  await httpRequest('/v1/beneficiaries')
  await httpRequest('/v1/onboarding/id/compliance/kyc')
  expect(mock.mock.calls[0][1].headers.Authorization).toBe('Bearer login')
  expect(mock.mock.calls[1][1].headers.Authorization).toBe('Bearer onboarding')
})
it('does not attach application tokens to unauthenticated requests', async () => {
  saveLoginToken('login')
  const mock = vi.fn().mockResolvedValue(new Response('{}'))
  vi.stubGlobal('fetch', mock)
  await httpResponse('/v1/auth/login', {}, false)
  expect(mock.mock.calls[0][1].headers).not.toHaveProperty('Authorization')
})
it.each([204, 200])('supports empty %s responses', async (status) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(status === 204 ? null : '', { status })),
  )
  await expect(httpRequest('/v1/example')).resolves.toBeUndefined()
})
it('preserves backend status, code and message', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(new Response('{"code":"NOT_FOUND","message":"Missing"}', { status: 404 })),
  )
  await expect(httpRequest('/v1/example')).rejects.toMatchObject({
    status: 404,
    code: 'NOT_FOUND',
    message: 'Missing',
    body: { code: 'NOT_FOUND', message: 'Missing' },
  })
})
it('handles non-JSON errors', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('upstream failed', { status: 502 })),
  )
  await expect(httpRequest('/v1/example')).rejects.toMatchObject({
    status: 502,
    body: 'upstream failed',
  })
})
it('invalidates the failed login session on 401', async () => {
  saveLoginToken('login')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))
  await expect(httpRequest('/v1/example')).rejects.toBeInstanceOf(HttpError)
  expect(getLoginToken()).toBeNull()
})
it.each(['TOKEN_EXPIRED', 'TOKEN_INVALID', 'UNAUTHENTICATED'])(
  'invalidates the login session when the backend rejects the token with %s',
  async (code) => {
    saveLoginToken('login')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code }), { status: 401 })),
    )
    await expect(httpRequest('/v1/example')).rejects.toBeInstanceOf(HttpError)
    expect(getLoginToken()).toBeNull()
  },
)
it.each(['INVALID_2FA_CODE', 'INVALID_CREDENTIALS'])(
  'keeps the session when a 401 carries the business error %s',
  async (code) => {
    saveLoginToken('login')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code, message: 'Invalid 2FA verification code' }), {
          status: 401,
        }),
      ),
    )
    await expect(httpRequest('/v1/auth/2fa/activate')).rejects.toMatchObject({ status: 401, code })
    expect(getLoginToken()).toBe('login')
  },
)
it('keeps the onboarding session when the 2FA activation code is rejected', async () => {
  saveAccessToken('onboarding')
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('{"code":"INVALID_2FA_CODE"}', { status: 401 })),
  )
  await expect(httpRequest('/v1/auth/2fa/activate')).rejects.toThrow()
  expect(getAccessToken()).toBe('onboarding')
})
it('onboarding failures do not clear the separate login', async () => {
  saveLoginToken('login')
  saveAccessToken('onboarding')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))
  await expect(httpRequest('/v1/onboarding/id')).rejects.toThrow()
  expect(getLoginToken()).toBe('login')
  expect(getAccessToken()).toBe('login')
})
it('does not clear a new login because an older request fails', async () => {
  saveLoginToken('old')
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async () => {
      saveLoginToken('new')
      return new Response('{}', { status: 401 })
    }),
  )
  await expect(httpRequest('/v1/example')).rejects.toThrow()
  expect(getLoginToken()).toBe('new')
})
it('reports network failures without a fake HTTP status', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')))
  await expect(httpRequest('/v1/example')).rejects.toMatchObject({
    status: 0,
    code: 'NETWORK_ERROR',
  })
})
it('propagates aborts unchanged', async () => {
  const error = new DOMException('aborted', 'AbortError')
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))
  await expect(httpRequest('/v1/example')).rejects.toBe(error)
})
it('rejects malformed JSON', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('invalid')))
  await expect(httpRequest('/v1/example')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
})
