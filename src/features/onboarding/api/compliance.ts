import { z } from 'zod'
import { DocumentUploadSchema } from '../schemas/responses'
import type {
  DocumentUploadStartResponse,
  TipoDocumento,
} from '@/features/onboarding/types/compliance'

import { httpRequest } from '@/shared/http/httpClient'

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
  return DocumentUploadSchema.refine(
    (value) => !doubleSided || !!value.uploadUrlBack,
    'URL de upload do verso ausente',
  ).parse(
    await httpRequest<unknown>(
      `/v1/onboarding/${encodeURIComponent(progressoCadastroId)}/compliance/documento`,
      {
        method: 'POST',
        body: JSON.stringify({ documentType, doubleSided }),
      },
    ),
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
  await httpRequest<void>(
    `/v1/onboarding/${encodeURIComponent(progressoCadastroId)}/compliance/documento`,
    {
      method: 'PUT',
      body: JSON.stringify({ documentoId }),
    },
  )
}

const AveniaTermsSchema = z.object({
  version: z.number().int().positive(),
  accepted: z.boolean(),
  documents: z.array(
    z.object({ key: z.string().nullable(), name: z.string().nullable(), url: z.url() }),
  ),
})

export type AveniaTerms = z.infer<typeof AveniaTermsSchema>

function aveniaTermsPath(kycVerificationId: string) {
  return `/v1/onboarding/${encodeURIComponent(kycVerificationId)}/compliance/avenia-terms`
}

/** Termos de uso e política de privacidade da Avenia que o titular precisa ver e aceitar. */
export async function getAveniaTerms(kycVerificationId: string): Promise<AveniaTerms> {
  return AveniaTermsSchema.parse(await httpRequest<unknown>(aveniaTermsPath(kycVerificationId)))
}

/** Registra na Avenia o aceite da versão exibida; o token de aceite fica só no backend. */
export async function acceptAveniaTerms(
  kycVerificationId: string,
  version: number,
): Promise<AveniaTerms> {
  return AveniaTermsSchema.parse(
    await httpRequest<unknown>(aveniaTermsPath(kycVerificationId), {
      method: 'POST',
      body: JSON.stringify({ version }),
    }),
  )
}
