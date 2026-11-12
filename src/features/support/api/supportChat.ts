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

const SUPPORT_CHAT_TIMEOUT_MS = 20_000

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
        throw new Error(
          'Muitas mensagens enviadas em sequência. Aguarde alguns segundos e tente novamente.',
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
