import { describe, expect, it, vi, afterEach } from 'vitest'
import { authService } from '@/features/auth/api/login'

describe('authService.login', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls POST /login with the correct payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => null,
      text: async function () {
        return JSON.stringify(await this.json())
      },
      ok: true,
      headers: new Headers({ Authorization: 'Bearer my-token' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await authService.login({ email: 'user@empresa.com', password: 'secret' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/auth/login',
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
        json: async () => null,
        text: async function () {
          return JSON.stringify(await this.json())
        },
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
        text: async function () {
          return JSON.stringify(await this.json())
        },
        ok: true,
        headers: new Headers(),
        json: () => Promise.resolve({ token: 'fallback-token' }),
      }),
    )

    const result = await authService.login({ email: 'a@b.com', password: '123' })

    expect(result).toEqual({ token: 'fallback-token' })
  })

  it('returns twoFactorRequired and tempToken when 2FA is challenged by backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        text: async function () {
          return JSON.stringify(await this.json())
        },
        ok: true,
        headers: new Headers(),
        json: () =>
          Promise.resolve({
            twoFactorRequired: true,
            tempToken: 'temp-jwt-token-123',
          }),
      }),
    )

    const result = await authService.login({ email: 'user2fa@empresa.com', password: '123' })

    expect(result).toEqual({
      twoFactorRequired: true,
      tempToken: 'temp-jwt-token-123',
    })
  })

  it('sends totpCode and tempToken in payload when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      text: async function () {
        return JSON.stringify(await this.json())
      },
      ok: true,
      headers: new Headers({ Authorization: 'Bearer final-token-2fa' }),
      json: async () => null,
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await authService.login({
      email: 'user2fa@empresa.com',
      password: '123',
      totpCode: '123456',
      tempToken: 'temp-token',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/auth/login',
      expect.objectContaining({
        body: JSON.stringify({
          email: 'user2fa@empresa.com',
          password: '123',
          totpCode: '123456',
          code: '123456',
          tempToken: 'temp-token',
        }),
      }),
    )
    expect(result).toEqual({ token: 'final-token-2fa' })
  })

  it('throws an invalid totp error on 401 when totpCode was submitted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => null,
        text: async function () {
          return JSON.stringify(await this.json())
        },
        ok: false,
        status: 401,
      }),
    )

    await expect(
      authService.login({
        email: 'a@b.com',
        password: '123',
        totpCode: '000000',
      }),
    ).rejects.toThrow('Código de autenticação inválido ou expirado')
  })

  it('throws when the response has no Authorization header and no token in body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        text: async function () {
          return JSON.stringify(await this.json())
        },
        ok: true,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      }),
    )

    await expect(authService.login({ email: 'a@b.com', password: '123' })).rejects.toThrow(
      'Token não encontrado na resposta',
    )
  })

  it('throws an invalid credentials error on 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => null,
        text: async function () {
          return JSON.stringify(await this.json())
        },
        ok: false,
        status: 401,
      }),
    )

    await expect(authService.login({ email: 'a@b.com', password: '123' })).rejects.toThrow(
      'E-mail ou senha inválidos',
    )
  })

  it('throws a blocked user error on 423', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => null,
        text: async function () {
          return JSON.stringify(await this.json())
        },
        ok: false,
        status: 423,
      }),
    )

    await expect(authService.login({ email: 'a@b.com', password: '123' })).rejects.toThrow(
      'Usuário bloqueado',
    )
  })

  it('preserves the HTTP status for other failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => null,
        text: async function () {
          return JSON.stringify(await this.json())
        },
        ok: false,
        status: 500,
      }),
    )

    await expect(authService.login({ email: 'a@b.com', password: '123' })).rejects.toThrow(
      'Não foi possível concluir a solicitação. Tente novamente.',
    )
  })
})
