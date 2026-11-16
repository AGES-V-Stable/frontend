import { describe, expect, it, vi, beforeEach } from 'vitest'
import { HttpError, httpRequest } from '@/shared/http/httpClient'
import { SupportChatRateLimitError, sendSupportChatMessage } from './supportChat'

vi.mock('@/shared/http/httpClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/http/httpClient')>()
  return {
    ...actual,
    httpRequest: vi.fn(),
  }
})

describe('sendSupportChatMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends message and history to /v1/support/chat and returns response', async () => {
    const mockResponse = {
      reply: 'Resposta do assistente sobre 2FA.',
      provider: 'gemini',
      suggestedQuestions: ['Como ativar meu 2FA?'],
      timestamp: '2026-11-09T18:00:00Z',
    }
    vi.mocked(httpRequest).mockResolvedValueOnce(mockResponse)

    const result = await sendSupportChatMessage({
      message: 'Como funciona o 2FA?',
      history: [{ role: 'user', content: 'Olá' }],
    })

    expect(httpRequest).toHaveBeenCalledWith('/v1/support/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Como funciona o 2FA?',
        history: [{ role: 'user', content: 'Olá' }],
      }),
      signal: expect.any(AbortSignal),
    })
    expect(result).toEqual(mockResponse)
  })

  it('maps HTTP 423 Locked to SupportChatRateLimitError with default 60s cooldown', async () => {
    vi.mocked(httpRequest).mockRejectedValueOnce(new HttpError('Rate limit exceeded', 423))

    const promise = sendSupportChatMessage({ message: 'Oi' })
    await expect(promise).rejects.toBeInstanceOf(SupportChatRateLimitError)
    await expect(promise).rejects.toMatchObject({
      name: 'SupportChatRateLimitError',
      message: 'Muitas mensagens enviadas em sequência. Aguarde alguns segundos e tente novamente.',
      retryAfterSeconds: 60,
    })
  })

  it('extracts retryAfterSeconds from backend 423 message and clamps between 1 and 60', async () => {
    vi.mocked(httpRequest).mockRejectedValueOnce(
      new HttpError(
        'Limite de mensagens atingido. Aguarde 42 segundos antes de enviar nova pergunta.',
        423,
      ),
    )

    const promise = sendSupportChatMessage({ message: 'Oi' })
    await expect(promise).rejects.toBeInstanceOf(SupportChatRateLimitError)
    await expect(promise).rejects.toMatchObject({
      message: 'Muitas mensagens enviadas em sequência. Aguarde alguns segundos e tente novamente.',
      retryAfterSeconds: 42,
    })

    vi.mocked(httpRequest).mockRejectedValueOnce(new HttpError('Aguarde 120 segundos.', 423))
    await expect(sendSupportChatMessage({ message: 'Oi' })).rejects.toMatchObject({
      retryAfterSeconds: 60,
    })

    vi.mocked(httpRequest).mockRejectedValueOnce(new HttpError('Aguarde 0 segundos.', 423))
    await expect(sendSupportChatMessage({ message: 'Oi' })).rejects.toMatchObject({
      retryAfterSeconds: 1,
    })
  })

  it('falls back to HttpError retryAfterSeconds when 423 message does not include seconds', async () => {
    vi.mocked(httpRequest).mockRejectedValueOnce(
      new HttpError('Rate limit exceeded', 423, undefined, undefined, 25),
    )

    await expect(sendSupportChatMessage({ message: 'Oi' })).rejects.toMatchObject({
      retryAfterSeconds: 25,
    })
  })

  it('maps HTTP 400 Bad Request to validation error message', async () => {
    vi.mocked(httpRequest).mockRejectedValueOnce(new HttpError('Mensagem muito longa', 400))

    await expect(sendSupportChatMessage({ message: 'Oi' })).rejects.toThrow('Mensagem muito longa')
  })

  it('maps unexpected errors to generic fallback message', async () => {
    vi.mocked(httpRequest).mockRejectedValueOnce(new Error('Network down'))

    await expect(sendSupportChatMessage({ message: 'Oi' })).rejects.toThrow(
      'Não foi possível obter resposta do assistente no momento. Tente novamente.',
    )
  })

  it('aborts a stalled request after 20 seconds and provides a timeout error', async () => {
    vi.useFakeTimers()
    try {
      vi.mocked(httpRequest).mockImplementationOnce(
        (_path, options) =>
          new Promise<never>((_resolve, reject) => {
            options?.signal?.addEventListener(
              'abort',
              () => {
                reject(new DOMException('Aborted', 'AbortError'))
              },
              { once: true },
            )
          }),
      )

      const request = sendSupportChatMessage({ message: 'Oi' })
      const assertion = expect(request).rejects.toThrow(
        'O assistente demorou mais que 20 segundos para responder. Tente novamente.',
      )
      await vi.advanceTimersByTimeAsync(20_000)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })

  it('propagates user-initiated cancellation to the HTTP client', async () => {
    const controller = new AbortController()
    vi.mocked(httpRequest).mockImplementationOnce(
      (_path, options) =>
        new Promise<never>((_resolve, reject) => {
          options?.signal?.addEventListener(
            'abort',
            () => {
              reject(new DOMException('Aborted', 'AbortError'))
            },
            { once: true },
          )
        }),
    )

    const request = sendSupportChatMessage({ message: 'Oi' }, controller.signal)
    controller.abort()
    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })
})
