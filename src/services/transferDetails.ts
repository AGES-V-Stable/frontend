import { TransferDetailsSchema } from '@/schemas/transferDetails'
import type { TransferDetails } from '@/types/transferDetails'

import { getAccessToken } from './authToken'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

/** Códigos do backend (backend#41) e dois locais: falha de rede e resposta fora do contrato. */
export type TransferDetailsErrorCode =
  | 'INVALID_TRANSFER_ID'
  | 'UNAUTHENTICATED'
  | 'USER_NOT_VERIFIED'
  | 'COMPANY_ACCESS_REQUIRED'
  | 'TRANSFER_NOT_FOUND'
  | 'RECEIPT_UNAVAILABLE'
  | 'RECEIPT_PROVIDER_ERROR'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'

export class TransferDetailsError extends Error {
  /** Nulo quando não houve resposta HTTP. */
  readonly status: number | null
  readonly code: TransferDetailsErrorCode

  constructor(status: number | null, code: TransferDetailsErrorCode, message: string) {
    super(message)
    this.name = 'TransferDetailsError'
    this.status = status
    this.code = code
  }
}

const KNOWN_CODES: readonly TransferDetailsErrorCode[] = [
  'INVALID_TRANSFER_ID',
  'UNAUTHENTICATED',
  'USER_NOT_VERIFIED',
  'COMPANY_ACCESS_REQUIRED',
  'TRANSFER_NOT_FOUND',
  'RECEIPT_UNAVAILABLE',
  'RECEIPT_PROVIDER_ERROR',
  'INTERNAL_ERROR',
]

const authHeaders = (accept: string): Record<string, string> => {
  const token = getAccessToken()
  return { Accept: accept, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

const transferUrl = (id: string, suffix = '') =>
  `${API_BASE_URL}/api/transferencias/${encodeURIComponent(id)}${suffix}`

/**
 * Lê `{code, message}` do corpo de erro; sem código reconhecido, cai em INTERNAL_ERROR. Todo 401 é
 * UNAUTHENTICATED: a camada de segurança devolve `TOKEN_EXPIRED` para sessão vencida.
 */
async function errorFrom(response: Response): Promise<TransferDetailsError> {
  let code: TransferDetailsErrorCode = 'INTERNAL_ERROR'
  let message = `Falha ao consultar a transferência (HTTP ${response.status}).`
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null) {
      const raw = (body as { code?: unknown }).code
      if (typeof raw === 'string' && (KNOWN_CODES as readonly string[]).includes(raw)) {
        code = raw as TransferDetailsErrorCode
      }
      const text = (body as { message?: unknown }).message
      if (typeof text === 'string' && text.trim()) message = text
    }
  } catch {
    /* corpo sem JSON: mantém o erro genérico */
  }
  if (response.status === 401) code = 'UNAUTHENTICATED'
  return new TransferDetailsError(response.status, code, message)
}

async function send(url: string, accept: string, signal?: AbortSignal): Promise<Response> {
  try {
    return await fetch(url, { headers: authHeaders(accept), signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new TransferDetailsError(null, 'NETWORK_ERROR', 'Não foi possível conectar ao servidor.')
  }
}

/** Consulta os detalhes registrados da transferência; nunca envia `companyId`. */
export async function getTransferDetails(
  id: string,
  signal?: AbortSignal,
): Promise<TransferDetails> {
  const response = await send(transferUrl(id), 'application/json', signal)
  if (!response.ok) throw await errorFrom(response)

  const parsed = TransferDetailsSchema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) {
    throw new TransferDetailsError(
      response.status,
      'INVALID_RESPONSE',
      'A resposta da transferência está fora do formato esperado.',
    )
  }
  return parsed.data
}

export interface ReceiptFile {
  blob: Blob
  fileName: string
}

/** Troca o que não é seguro em nome de arquivo e garante a extensão .pdf. */
function safeFileName(candidate: string | null, fallback: string): string {
  const cleaned = Array.from(candidate ?? '')
    .filter((character) => character.charCodeAt(0) > 0x1f && !'\\/:*?"<>|'.includes(character))
    .join('')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 120)
  if (!cleaned) return fallback
  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned}.pdf`
}

export function fileNameFromContentDisposition(header: string | null): string | null {
  if (!header) return null
  const extended = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)
  if (extended?.[1]) {
    try {
      return decodeURIComponent(extended[1].trim())
    } catch {
      /* cai no filename simples */
    }
  }
  const plain = /filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i.exec(header)
  return (plain?.[1] ?? plain?.[2] ?? '').trim() || null
}

/**
 * Baixa o PDF do comprovante. Só aceita `application/pdf`: um corpo JSON/HTML de erro nunca é
 * entregue como documento. O token vai no header, nunca na URL.
 */
export async function downloadTransferReceipt(
  id: string,
  signal?: AbortSignal,
): Promise<ReceiptFile> {
  const response = await send(transferUrl(id, '/comprovante'), 'application/pdf', signal)
  if (!response.ok) throw await errorFrom(response)

  const contentType = response.headers.get('Content-Type') ?? ''
  if (!contentType.toLowerCase().startsWith('application/pdf')) {
    throw new TransferDetailsError(
      response.status,
      'INVALID_RESPONSE',
      'O servidor não devolveu um PDF para este comprovante.',
    )
  }

  const blob = await response.blob()
  const fileName = safeFileName(
    fileNameFromContentDisposition(response.headers.get('Content-Disposition')),
    `comprovante-${id}.pdf`,
  )
  return { blob, fileName }
}

/** Entrega o arquivo ao navegador e libera a URL temporária. */
export function saveReceipt({ blob, fileName }: ReceiptFile): void {
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}
