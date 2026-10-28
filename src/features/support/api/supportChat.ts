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

export async function sendSupportChatMessage(
  payload: SupportChatRequest,
): Promise<SupportChatResponse> {
  try {
    return await httpRequest<SupportChatResponse>('/v1/support/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.status === 423) {
        throw new Error(
          'Muitas mensagens enviadas em sequência. Aguarde alguns segundos e tente novamente.',
          { cause: error },
        )
      }
      if (error.status === 400) {
        throw new Error('A mensagem informada é inválida ou excede o limite de 500 caracteres.', {
          cause: error,
        })
      }
    }
    throw new Error('Não foi possível obter resposta do assistente no momento. Tente novamente.', {
      cause: error,
    })
  }
}
