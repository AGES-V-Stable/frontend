import { HttpError, httpRequest } from '@/shared/http/httpClient'

export interface SupportChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface SupportChatRequest {
  message: string
  history?: SupportChatMessage[]
}

export interface SupportChatResponse {
  reply: string
  provider: string
  suggestedQuestions: string[]
  timestamp: string
}

export const SUPPORT_CHAT_MAX_REQUESTS_PER_MINUTE = 15
export const SUPPORT_CHAT_RATE_LIMIT_WINDOW_MS = 60_000

export function isSupportChatEnabled(
  value: string | undefined = import.meta.env.VITE_SUPPORT_CHAT_ENABLED,
): boolean {
  return value?.trim().toLowerCase() !== 'false'
}

const SUPPORT_CHAT_TIMEOUT_MS = 20_000
const SUPPORT_CHAT_RATE_LIMIT_FALLBACK_SECONDS = 60

export class SupportChatRateLimitError extends Error {
  readonly retryAfterSeconds: number

  constructor(message: string, retryAfterSeconds = 60, options?: ErrorOptions) {
    super(message, options)
    this.name = 'SupportChatRateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

function parseRetryAfterSeconds(error: HttpError): number {
  const match = /(\d+)\s*segundos?/i.exec(error.message)
  if (match) {
    const parsed = Number(match[1])
    if (Number.isFinite(parsed)) {
      return Math.min(60, Math.max(1, parsed))
    }
  }

  if (typeof error.retryAfterSeconds === 'number' && Number.isFinite(error.retryAfterSeconds)) {
    return Math.min(60, Math.max(1, Math.ceil(error.retryAfterSeconds)))
  }

  return SUPPORT_CHAT_RATE_LIMIT_FALLBACK_SECONDS
}

export async function sendSupportChatMessage(
  payload: SupportChatRequest,
  signal?: AbortSignal,
): Promise<SupportChatResponse> {
  const controller = new AbortController()
  const abortRequest = () => controller.abort()

  if (signal?.aborted) {
    controller.abort()
  } else {
    signal?.addEventListener('abort', abortRequest, { once: true })
  }

  let timedOut = false
  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, SUPPORT_CHAT_TIMEOUT_MS)

  try {
    return await httpRequest<SupportChatResponse>('/v1/support/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    if (timedOut) {
      throw new Error(
        'O assistente demorou mais que 20 segundos para responder. Tente novamente.',
        {
          cause: error,
        },
      )
    }
    if (error instanceof HttpError) {
      if (error.status === 423) {
        const retryAfterSeconds = parseRetryAfterSeconds(error)
        throw new SupportChatRateLimitError(
          'Muitas mensagens enviadas em sequência. Aguarde alguns segundos e tente novamente.',
          retryAfterSeconds,
          { cause: error },
        )
      }
      if (error.status === 400) {
        throw new Error(
          error.message || 'A mensagem informada é inválida ou excede o limite de 500 caracteres.',
          { cause: error },
        )
      }
    }
    throw new Error('Não foi possível obter resposta do assistente no momento. Tente novamente.', {
      cause: error,
    })
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abortRequest)
  }
}
