import { describe, expect, it, vi, beforeEach } from 'vitest'
import { authService } from './login'

describe('authService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('deve retornar o token com sucesso usando Bearer', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ Authorization: 'Bearer token-secreto-123' }),
    })

    const result = await authService.login({ email: 'a@b.com', password: '123' })
    expect(result.token).toBe('token-secreto-123')
  })

  it('deve retornar o token com sucesso sem prefixo Bearer', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ Authorization: 'token-secreto-456' }),
    })

    const result = await authService.login({ email: 'a@b.com', password: '123' })
    expect(result.token).toBe('token-secreto-456')
  })

  it('deve estourar erro 401 - E-mail ou senha inválidos', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 401 })

    await expect(authService.login({ email: 'a@b.com', password: '123' })).rejects.toThrow(
      'E-mail ou senha inválidos',
    )
  })

  it('deve estourar erro 423 - Usuário bloqueado', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 423 })

    await expect(authService.login({ email: 'a@b.com', password: '123' })).rejects.toThrow(
      'Usuário bloqueado',
    )
  })

  it('deve estourar erro genérico para outros problemas', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })

    await expect(authService.login({ email: 'a@b.com', password: '123' })).rejects.toThrow(
      'Erro ao realizar login',
    )
  })

  it('deve estourar erro se a API não devolver o cabeçalho Authorization', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(), // Sem headers
    })

    await expect(authService.login({ email: 'a@b.com', password: '123' })).rejects.toThrow(
      'Token não retornado pelo servidor',
    )
  })
})
