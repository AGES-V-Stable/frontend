import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, httpRequest } from '@/shared/http/httpClient'
import { getStoredUserId } from '@/shared/http/authToken'
import {
  approve2faReset,
  get2faResetRequests,
  reject2faReset,
  request2faRecovery,
  twoFactorService,
} from './twoFactor'

vi.mock('@/shared/http/httpClient', async () => ({
  ApiError: (
    await vi.importActual<typeof import('@/shared/http/httpClient')>('@/shared/http/httpClient')
  ).ApiError,
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

describe('recuperação de 2FA e revisão administrativa', () => {
  const request = {
    id: 'req-1',
    userId: 'u1',
    userName: 'Marina Costa',
    userEmail: 'marina@empresa.com',
    requestedAt: '2026-10-22T10:00:00Z',
    reason: 'Perdi o celular.',
    status: 'PENDING',
  }

  beforeEach(() => vi.clearAllMocks())

  it('envia a solicitação de recuperação sem autenticação e valida a resposta', async () => {
    vi.mocked(httpRequest).mockResolvedValueOnce({ success: true, id: 'req-1' })
    const data = { email: 'a@b.com', fullName: 'A B', documentNumber: '1', reason: 'x' }

    await expect(request2faRecovery(data)).resolves.toEqual({ success: true, id: 'req-1' })
    expect(httpRequest).toHaveBeenCalledWith(
      '/v1/auth/2fa/recovery-request',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(data) }),
      false,
    )
  })

  it('lista as solicitações quando a resposta segue o contrato', async () => {
    vi.mocked(httpRequest).mockResolvedValueOnce([request])

    await expect(get2faResetRequests()).resolves.toEqual([request])
  })

  it.each([
    ['um objeto no lugar da lista', { content: [] }],
    ['um status desconhecido', [{ ...request, status: 'DONE' }]],
    ['uma solicitação sem id', [{ ...request, id: undefined }]],
  ])('rejeita a listagem com %s em vez de exibir uma lista vazia', async (_, body) => {
    vi.mocked(httpRequest).mockResolvedValueOnce(body)

    await expect(get2faResetRequests()).rejects.toThrow()
  })

  it('aprova e rejeita validando as respostas', async () => {
    vi.mocked(httpRequest)
      .mockResolvedValueOnce({ success: true, withdrawalLockedUntil: '2026-10-24T10:00:00Z' })
      .mockResolvedValueOnce({ success: true })

    await expect(approve2faReset('req-1')).resolves.toMatchObject({ success: true })
    await expect(reject2faReset('req-1', 'Documento ilegível')).resolves.toEqual({ success: true })
    expect(httpRequest).toHaveBeenLastCalledWith(
      '/v1/admin/2fa-recovery-requests/req-1/reject',
      expect.objectContaining({ body: JSON.stringify({ reason: 'Documento ilegível' }) }),
    )
  })

  it('rejeita a aprovação sem a data da trava de saque', async () => {
    vi.mocked(httpRequest).mockResolvedValueOnce({ success: true })

    await expect(approve2faReset('req-1')).rejects.toThrow()
  })
})

describe('mensagens das recusas de código 2FA', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    [
      401,
      'INVALID_2FA_CODE',
      'Invalid 2FA verification code',
      'Código de autenticação inválido ou expirado.',
    ],
    [
      422,
      'UNPROCESSABLE_ENTITY',
      '2FA setup has not been initiated for this account',
      'A configuração do 2FA não foi iniciada. Gere um novo QR Code e tente novamente.',
    ],
    [
      423,
      'ACCOUNT_LOCKED',
      'Too many failed 2FA attempts. Try again later.',
      'Muitas tentativas com código inválido. Aguarde alguns minutos e tente novamente.',
    ],
  ])('traduz o %s (%s) da ativação', async (status, code, backendMessage, expected) => {
    vi.mocked(httpRequest).mockRejectedValueOnce(new ApiError(status, backendMessage, code))

    await expect(twoFactorService.activate('000000', undefined, 'u1')).rejects.toMatchObject({
      status,
      code,
      message: expected,
    })
    expect(twoFactorService.isActivated('u1')).toBe(false)
  })

  it('traduz o código atual recusado na reconfiguração', async () => {
    vi.mocked(httpRequest).mockRejectedValueOnce(
      new ApiError(401, 'Invalid 2FA verification code', 'INVALID_CREDENTIALS'),
    )

    await expect(twoFactorService.reconfigure('000000')).rejects.toThrow(
      'Código de autenticação inválido ou expirado.',
    )
  })

  it('mantém os demais erros como vieram', async () => {
    const failure = new ApiError(500, 'Internal error', 'INTERNAL_ERROR')
    vi.mocked(httpRequest).mockRejectedValueOnce(failure)

    await expect(twoFactorService.setup()).rejects.toBe(failure)
  })
})

describe('setup inicial do 2FA', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reaproveita a requisição em andamento em vez de gerar um segundo segredo', async () => {
    let resolve!: (value: unknown) => void
    vi.mocked(httpRequest).mockReturnValueOnce(new Promise((r) => (resolve = r)))
    const first = new AbortController()

    const firstCall = twoFactorService.setup(first.signal)
    first.abort()
    const secondCall = twoFactorService.setup(new AbortController().signal)
    resolve({ otpauthUri: 'otpauth://totp/V-Stable:a?secret=ABC' })

    await expect(secondCall).resolves.toEqual({
      otpauthUri: 'otpauth://totp/V-Stable:a?secret=ABC',
    })
    await expect(firstCall).resolves.toEqual({ otpauthUri: 'otpauth://totp/V-Stable:a?secret=ABC' })
    expect(httpRequest).toHaveBeenCalledTimes(1)
  })

  it('faz um novo setup depois que o anterior terminou, inclusive após falha', async () => {
    vi.mocked(httpRequest)
      .mockRejectedValueOnce(new ApiError(500, 'Internal error', 'INTERNAL_ERROR'))
      .mockResolvedValueOnce({ otpauthUri: 'otpauth://totp/V-Stable:a?secret=XYZ' })

    await expect(twoFactorService.setup()).rejects.toThrow()
    await expect(twoFactorService.setup()).resolves.toMatchObject({
      otpauthUri: 'otpauth://totp/V-Stable:a?secret=XYZ',
    })
    expect(httpRequest).toHaveBeenCalledTimes(2)
  })

  it('não compartilha a reconfiguração, que depende do código atual', async () => {
    vi.mocked(httpRequest).mockResolvedValue({ otpauthUri: 'otpauth://totp/V-Stable:a?secret=N' })

    await Promise.all([
      twoFactorService.reconfigure('111111'),
      twoFactorService.reconfigure('222222'),
    ])

    expect(httpRequest).toHaveBeenCalledTimes(2)
  })
})
