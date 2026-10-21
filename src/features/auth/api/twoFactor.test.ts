import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { httpRequest } from '@/shared/http/httpClient'
import { twoFactorService } from './twoFactor'

vi.mock('@/shared/http/httpClient', () => ({
  httpRequest: vi.fn(),
}))

describe('twoFactorService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('retorna os dados de configuração de 2FA quando o endpoint responde com sucesso', async () => {
    const mockData = {
      otpauthUri: 'otpauth://totp/V-Stable:test@empresa.com?secret=TESTSECRET123',
      secret: 'TESTSECRET123',
    }
    vi.mocked(httpRequest).mockResolvedValueOnce(mockData)

    const result = await twoFactorService.setup()

    expect(httpRequest).toHaveBeenCalledWith(
      '/v1/auth/2fa/setup',
      expect.objectContaining({ method: 'POST' }),
      false,
    )
    expect(result).toEqual(mockData)
  })

  it('retorna fallback gracioso quando o endpoint falha', async () => {
    vi.mocked(httpRequest).mockRejectedValueOnce(new Error('Network error'))

    const result = await twoFactorService.setup()

    expect(result.otpauthUri).toContain('otpauth://totp/V-Stable')
    expect(result.secret).toBe('JBSWY3DPEHPK3PXP')
  })

  it('chama activate enviando o código informado', async () => {
    vi.mocked(httpRequest).mockResolvedValueOnce({ success: true })

    const result = await twoFactorService.activate('123456')

    expect(httpRequest).toHaveBeenCalledWith(
      '/v1/auth/2fa/activate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: '123456' }),
      }),
      false,
    )
    expect(result).toEqual({ success: true })
  })
})
