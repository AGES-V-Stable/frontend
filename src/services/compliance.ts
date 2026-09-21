import type { DocumentUploadStartResponse, TipoDocumento } from '@/types/compliance'

import { httpRequest } from './httpClient'

/**
 * Inicia o upload do documento de identidade do representante. O backend assina
 * e faz a chamada à Avenia (POST /v2/documents/) e devolve o id do documento e a(s)
 * URL(s) pré-assinada(s) da S3 — a assinatura exige a chave privada da API Key, que
 * não pode viver no frontend.
 */
export async function startDocumentUpload(
  progressoCadastroId: string,
  documentType: TipoDocumento,
  doubleSided: boolean,
): Promise<DocumentUploadStartResponse> {
  return httpRequest<DocumentUploadStartResponse>(
    `/v1/onboarding/${progressoCadastroId}/compliance/documento`,
    {
      method: 'POST',
      body: JSON.stringify({ documentType, doubleSided }),
    },
  )
}

/**
 * Envia o binário do arquivo direto para a URL pré-assinada da S3, sem passar pelo
 * nosso backend — a URL já carrega a autorização necessária. Confirmado contra o
 * sandbox real: a assinatura da Avenia inclui "If-None-Match: *" (escrita condicional
 * — não sobrescrever se já existir) como header assinado; sem ele o S3 sempre recusa
 * com 403 SignatureDoesNotMatch.
 */
export async function uploadFileToS3(url: string, file: File): Promise<void> {
  const response = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream', 'If-None-Match': '*' },
  })

  if (!response.ok) {
    throw new Error(`Falha ao enviar arquivo para o storage (status ${response.status})`)
  }
}

/**
 * Registra o id do documento de identidade enviado no progresso de cadastro, ao
 * final do upload confirmado na S3.
 */
export async function submitDocumentResult(
  progressoCadastroId: string,
  documentoId: string,
): Promise<void> {
  await httpRequest<void>(`/v1/onboarding/${progressoCadastroId}/compliance/documento`, {
    method: 'PUT',
    body: JSON.stringify({ documentoId }),
  })
}
