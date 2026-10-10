import { describe, expect, it, vi, afterEach } from 'vitest'
import { authService } from './login'

describe('authService.login', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls POST /login with the correct payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ Authorization: 'Bearer my-token' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await authService.login({ email: 'user@empresa.com', password: 'secret' })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/v1/auth/login',
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
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ Authorization: 'Bearer my-token' }),
      }),
    )

    const result = await authService.login({ email: 'a@b.com', password: '123' })

    expect(result).toEqual({ token: 'my-token' })
  })

  it('returns the token from body as fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: () => Promise.resolve({ token: 'fallback-token' })
      }),
    )

    const result = await authService.login({ email: 'a@b.com', password: '123' })

    expect(result).toEqual({ token: 'fallback-token' })
  })

  it('throws when the response has no Authorization header', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: () => Promise.resolve({})
      }),
    )

    await expect(authService.login({ email: 'a@b.com', password: '123' })).rejects.toThrow(
      'Token não encontrado na resposta',
    )
  })

  it('throws an invalid credentials error on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))

    await expect(authService.login({ email: 'a@b.com', password: '123' })).rejects.toThrow(
      'E-mail ou senha inválidos',
    )
  })

  it('throws a blocked user error on 423', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 423 }))

    await expect(authService.login({ email: 'a@b.com', password: '123' })).rejects.toThrow(
      'Usuário bloqueado',
    )
  })

  it('throws a generic error for other failure statuses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    await expect(authService.login({ email: 'a@b.com', password: '123' })).rejects.toThrow(
      'E-mail ou senha inválidos',
    )
  })
})