import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from './api'
import { saveAccessToken } from './authToken'
import { authService } from './login'

describe('authService.login', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('calls POST /v1/auth/login (the backend route) with the trimmed payload', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 200, headers: { Authorization: 'Bearer abc123' } }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await authService.login({ email: ' user@empresa.com ', password: 'secret' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@empresa.com', password: 'secret' }),
      }),
    )
  })

  it('uses the configured API origin without duplicating slashes', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.vstable.test/')
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 200, headers: { Authorization: 'Bearer t' } }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await authService.login({ email: 'a@b.com', password: 'x' })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.vstable.test/v1/auth/login',
      expect.anything(),
    )
  })

  it('never sends a stale stored token to the public login route', async () => {
    saveAccessToken('stale-token')
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 200, headers: { Authorization: 'Bearer t' } }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await authService.login({ email: 'a@b.com', password: 'x' })

    const [, options] = fetchMock.mock.calls[0]!
    expect(options.headers).not.toHaveProperty('Authorization')
  })

  it('returns the token stripped of the "Bearer " prefix', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(null, { status: 200, headers: { Authorization: 'Bearer abc123' } }),
        ),
    )

    await expect(authService.login({ email: 'a@b.com', password: 'x' })).resolves.toEqual({
      token: 'abc123',
    })
  })

  it('returns the token as-is when the header has no "Bearer " prefix', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(null, { status: 200, headers: { Authorization: 'abc123' } }),
        ),
    )

    await expect(authService.login({ email: 'a@b.com', password: 'x' })).resolves.toEqual({
      token: 'abc123',
    })
  })

  it('throws when the response has no Authorization header', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))

    await expect(authService.login({ email: 'a@b.com', password: 'x' })).rejects.toThrow(
      'Token não retornado pelo servidor',
    )
  })

  it('throws an invalid credentials ApiError on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))

    await expect(authService.login({ email: 'a@b.com', password: 'x' })).rejects.toMatchObject({
      status: 401,
      message: 'E-mail ou senha inválidos',
    })
  })

  it('throws a blocked user error on 423', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 423 })))

    await expect(authService.login({ email: 'a@b.com', password: 'x' })).rejects.toThrow(
      'Usuário bloqueado',
    )
  })

  it('throws a server-unavailable error for other failure statuses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })))

    await expect(authService.login({ email: 'a@b.com', password: 'x' })).rejects.toMatchObject({
      status: 500,
      message: 'Não foi possível entrar agora. Tente novamente em instantes.',
    })
  })

  it('reports network failures separately from bad credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const error = await authService.login({ email: 'a@b.com', password: 'x' }).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
  })
})
