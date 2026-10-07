import { describe, expect, it, vi } from 'vitest'
import { parseJwt } from './jwt'

describe('parseJwt', () => {
  it('decodifica corretamente o payload de um token JWT válido', () => {
    // Um token mock com payload { "role": ["ADMIN"] } em Base64
    const validToken = 'header.eyJyb2xlIjpbIkFETUlOIl19.signature'

    const result = parseJwt(validToken)
    expect(result).toEqual({ role: ['ADMIN'] })
  })

  it('retorna null e loga o erro no console se o token for malformado ou inválido', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Passando uma string que vai quebrar o split('.') ou o atob()
    const result = parseJwt('token-invalido-sem-pontos')

    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith('Erro ao decodificar o token', expect.any(Error))

    consoleSpy.mockRestore()
  })
})
