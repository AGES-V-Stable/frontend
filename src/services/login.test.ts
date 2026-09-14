import { afterEach, describe, expect, it, vi } from 'vitest'
import { authService } from './login'

describe('authService.login', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mockCredentials = { email: 'admin@empresa.com', password: 'senha' }

  it('retorna o token formatado quando o header Authorization contém o prefixo Bearer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('Bearer meu-token-valido') },
      }),
    )

    const response = await authService.login(mockCredentials)
    expect(response).toEqual({ token: 'meu-token-valido' })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/login'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('retorna o token puro quando o header Authorization não contém o prefixo Bearer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('token-sem-bearer') },
      }),
    )

    const response = await authService.login(mockCredentials)
    expect(response).toEqual({ token: 'token-sem-bearer' })
  })

  it('dispara erro de credenciais inválidas quando o status for 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    )

    await expect(authService.login(mockCredentials)).rejects.toThrow('E-mail ou senha inválidos')
  })

  it('dispara erro de usuário bloqueado quando o status for 423', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 423,
      }),
    )

    await expect(authService.login(mockCredentials)).rejects.toThrow('Usuário bloqueado')
  })

  it('dispara erro genérico quando a resposta não for OK (ex: 500)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    )

    await expect(authService.login(mockCredentials)).rejects.toThrow('Erro ao realizar login')
  })

  it('dispara erro quando o header Authorization estiver ausente', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue(null) },
      }),
    )

    await expect(authService.login(mockCredentials)).rejects.toThrow(
      'Token não retornado pelo servidor',
    )
  })
})
