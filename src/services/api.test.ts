import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiFetch, apiJson, apiUrl, UNAUTHORIZED_EVENT } from './api'
import { getAccessToken, saveAccessToken } from './authToken'

describe('api client', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('builds same-origin /v1 URLs by default', () => {
    expect(apiUrl('/users/me')).toBe('/v1/users/me')
    expect(apiUrl('users/me')).toBe('/v1/users/me')
  })

  it('prefixes the configured origin and strips trailing slashes', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.vstable.test//')
    expect(apiUrl('/users/me')).toBe('https://api.vstable.test/v1/users/me')
  })

  it('rejects a relative API origin', () => {
    vi.stubEnv('VITE_API_URL', '/api')
    expect(() => apiUrl('/users/me')).toThrow()
  })

  it('sends no Authorization header when there is no session', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await apiJson('/example')

    const [, options] = fetchMock.mock.calls[0]!
    expect(options.headers).not.toHaveProperty('Authorization')
  })

  it('includes the session bearer token on protected requests', async () => {
    saveAccessToken('token-abc')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await apiJson('/example')

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/example',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-abc' }),
      }),
    )
  })

  it('omits the token on public requests', async () => {
    saveAccessToken('token-abc')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/onboarding', { method: 'POST', authenticated: false })

    const [, options] = fetchMock.mock.calls[0]!
    expect(options.headers).not.toHaveProperty('Authorization')
  })

  it('returns undefined for 204 and for empty bodies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }))
    await expect(apiJson('/example')).resolves.toBeUndefined()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 200 })))
    await expect(apiJson('/example')).resolves.toBeUndefined()
  })

  it('parses the backend error contract into an ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Empresa não verificada', code: 'X' }), {
          status: 403,
        }),
      ),
    )

    const error = await apiJson('/example').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 403, message: 'Empresa não verificada', code: 'X' })
  })

  it('keeps non-JSON error bodies and uses a generic message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => 'not found' }),
    )

    await expect(apiJson('/example')).rejects.toMatchObject({
      status: 404,
      body: 'not found',
      message: 'Não foi possível concluir a solicitação. Tente novamente.',
    })
  })

  it('falls back to a generic message when the error body cannot be read', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('not json')
        },
      }),
    )

    await expect(apiJson('/example')).rejects.toThrow(
      'Não foi possível concluir a solicitação. Tente novamente.',
    )
  })

  it('ends the session and notifies the app when a protected request returns 401', async () => {
    saveAccessToken('expired-token')
    sessionStorage.setItem('vstable:onboarding:representative-personal-data', '{}')
    const listener = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, listener)
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ code: 'TOKEN_EXPIRED' }), { status: 401 }),
        ),
    )

    await expect(apiJson('/users/me')).rejects.toMatchObject({ status: 401, code: 'TOKEN_EXPIRED' })

    expect(getAccessToken()).toBeNull()
    expect(sessionStorage.getItem('vstable:onboarding:representative-personal-data')).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener(UNAUTHORIZED_EVENT, listener)
  })

  it('does not treat a 401 without a session (e.g. wrong password) as an expired session', async () => {
    const listener = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, listener)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))

    await apiFetch('/auth/login', { method: 'POST', authenticated: false })

    expect(listener).not.toHaveBeenCalled()
    window.removeEventListener(UNAUTHORIZED_EVENT, listener)
  })
})
