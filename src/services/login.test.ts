import { afterEach, describe, expect, it, vi } from 'vitest'

import { authService } from './login'

describe('authService.login', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls POST /login with the correct payload', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 200, headers: { Authorization: 'Bearer abc123' } }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await authService.login({ email: 'user@empresa.com', password: 'secret' })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/login',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@empresa.com', password: 'secret' }),
      }),
    )
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

  it('throws an invalid credentials error on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))

    await expect(authService.login({ email: 'a@b.com', password: 'x' })).rejects.toThrow(
      'E-mail ou senha inválidos',
    )
  })

  it('throws a blocked user error on 423', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 423 })))

    await expect(authService.login({ email: 'a@b.com', password: 'x' })).rejects.toThrow(
      'Usuário bloqueado',
    )
  })

  it('throws a generic error for other failure statuses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })))

    await expect(authService.login({ email: 'a@b.com', password: 'x' })).rejects.toThrow(
      'Erro ao realizar login',
    )
  })
})
