import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { httpRequest } from '@/shared/http/httpClient'
import { getStoredUserId } from '@/shared/http/authToken'
import { twoFactorService } from './twoFactor'

vi.mock('@/shared/http/httpClient', () => ({
  httpRequest: vi.fn(),
}))

vi.mock('@/shared/http/authToken', () => ({
  getStoredUserId: vi.fn(),
  getAccessToken: vi.fn(),
}))

describe('twoFactorService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
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
    )
    expect(result).toEqual(mockData)
  })

  it('propaga erro quando o endpoint falha', async () => {
    vi.mocked(httpRequest).mockRejectedValueOnce(new Error('Network error'))

    await expect(twoFactorService.setup()).rejects.toThrow('Network error')
  })

  it('chama activate enviando o código informado', async () => {
    vi.mocked(httpRequest).mockResolvedValueOnce({ success: true })

    const result = await twoFactorService.activate('123456', undefined, 'user-1')

    expect(httpRequest).toHaveBeenCalledWith(
      '/v1/auth/2fa/activate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: '123456' }),
      }),
    )
    expect(result).toEqual({ success: true, recoveryCodes: undefined })
    expect(twoFactorService.isActivated('user-1')).toBe(true)
  })

  it('rejeita ativação e não grava estado ativo quando o backend retorna success: false', async () => {
    vi.mocked(httpRequest).mockResolvedValueOnce({ success: false })

    await expect(twoFactorService.activate('123456', undefined, 'user-1')).rejects.toThrow(
      'Falha na ativação da autenticação em duas etapas.',
    )
    expect(twoFactorService.isActivated('user-1')).toBe(false)
  })

  it('rejeita ativação e não grava estado ativo quando a resposta da API for inválida', async () => {
    vi.mocked(httpRequest).mockResolvedValueOnce('invalid string response')

    await expect(twoFactorService.activate('123456', undefined, 'user-1')).rejects.toThrow()
    expect(twoFactorService.isActivated('user-1')).toBe(false)
  })

  it('retorna os códigos de recuperação quando fornecidos pelo backend no activate', async () => {
    const recoveryCodes = ['A1B2-C3D4', 'E5F6-G7H8']
    vi.mocked(httpRequest).mockResolvedValueOnce({ success: true, recoveryCodes })

    const result = await twoFactorService.activate('123456')

    expect(result).toEqual({ success: true, recoveryCodes })
  })

  it('envia currentTotpCode no body e no header durante a reconfiguração', async () => {
    const mockData = {
      otpauthUri: 'otpauth://totp/V-Stable:test@empresa.com?secret=NEWSECRET123',
      secret: 'NEWSECRET123',
    }
    vi.mocked(httpRequest).mockResolvedValueOnce(mockData)

    const result = await twoFactorService.setup('654321')

    expect(httpRequest).toHaveBeenCalledWith(
      '/v1/auth/2fa/setup',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Current-Totp': '654321' }),
        body: JSON.stringify({ currentTotpCode: '654321' }),
      }),
    )
    expect(result).toEqual(mockData)
  })

  it('propaga erro quando o endpoint de reconfiguração com currentTotpCode falha', async () => {
    vi.mocked(httpRequest).mockRejectedValueOnce(
      new Error('Código do autenticador atual inválido ou expirado.'),
    )

    await expect(twoFactorService.setup('000000')).rejects.toThrow(
      'Código do autenticador atual inválido ou expirado.',
    )
  })

  it('permite verificar e definir estado de 2FA ativado escopado por usuário', () => {
    localStorage.clear()
    expect(twoFactorService.isActivated('user-1')).toBe(false)
    expect(twoFactorService.isActivated('user-2')).toBe(false)

    twoFactorService.setActivated(true, 'user-1')
    expect(twoFactorService.isActivated('user-1')).toBe(true)
    expect(twoFactorService.isActivated('user-2')).toBe(false)

    twoFactorService.setActivated(false, 'user-1')
    expect(twoFactorService.isActivated('user-1')).toBe(false)
  })

  it('utiliza getStoredUserId quando nenhum userId for explicitamente fornecido', () => {
    vi.mocked(getStoredUserId).mockReturnValue('user-stored-99')

    expect(twoFactorService.isActivated()).toBe(false)
    twoFactorService.setActivated(true)
    expect(localStorage.getItem('vstable_2fa_active_user-stored-99')).toBe('true')
  })
})

it.each([null, undefined, {}, { success: true, recoveryCodes: [123] }])(
  'does not activate for an invalid API response %j',
  async (response) => {
    localStorage.clear()
    vi.mocked(httpRequest).mockResolvedValueOnce(response)
    await expect(twoFactorService.activate('123456', undefined, 'invalid-user')).rejects.toThrow()
    expect(twoFactorService.isActivated('invalid-user')).toBe(false)
  },
)

it('ignores the legacy shared flag and does not persist without a user identity', () => {
  vi.mocked(getStoredUserId).mockReturnValue(undefined)
  localStorage.clear()
  localStorage.setItem('vstable_2fa_active', 'true')
  expect(twoFactorService.isActivated()).toBe(false)
  twoFactorService.setActivated(true)
  expect(localStorage.length).toBe(1)
})

it('keeps activation tied to the user who started the request', async () => {
  localStorage.clear()
  vi.mocked(getStoredUserId).mockReturnValue('first-user')
  vi.mocked(httpRequest).mockImplementationOnce(async () => {
    vi.mocked(getStoredUserId).mockReturnValue('second-user')
    return { success: true }
  })
  await twoFactorService.activate('123456')
  expect(twoFactorService.isActivated('first-user')).toBe(true)
  expect(twoFactorService.isActivated()).toBe(false)
})
