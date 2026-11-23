import { z } from 'zod'
import { httpRequest } from '@/shared/http/httpClient'

export const individualKycStatusSchema = z.object({
  termsAccepted: z.boolean(),
  submitted: z.boolean(),
  kycStatus: z.string().nullable(),
  amlStatus: z.string().nullable(),
})

export type IndividualKycStatus = z.infer<typeof individualKycStatusSchema>

export interface IndividualKycProfile {
  firstName: string
  lastName: string
  dateOfBirth: string
  taxId: string
  phoneNumber: string
  addressLine1: string
  addressLine2: string | null
  city: string
  stateProvinceRegion: string
  postalCode: string
  country: 'BR'
  idDocCountry: 'BR'
  idDocType: 'PASSPORT' | 'ID_CARD' | 'DRIVERS'
  proofOfAddressDocType: string | null
}

export interface IndividualKycFiles {
  idFront: File
  idBack: File | null
  selfie: File
  proofAddress: File | null
}

const path = '/v1/blindpay/kyc'
const TERMS_SESSION_KEY = 'vstable:blindpay:terms:session'
const TERMS_RETURN_PREFIX = 'vstable:blindpay:terms:return:'

export function captureIndividualTermsReturn(search: string): void {
  const params = new URLSearchParams(search)
  const state = params.get('state')
  const tosId = params.get('tos_id')
  if (state && /^[0-9a-f-]{36}$/i.test(state) && tosId && /^to_[A-Za-z0-9]{12}$/.test(tosId)) {
    localStorage.setItem(TERMS_RETURN_PREFIX + state, tosId)
    localStorage.setItem(TERMS_SESSION_KEY, state)
  }
}

export async function checkIndividualTermsReturn(): Promise<void> {
  const state = localStorage.getItem(TERMS_SESSION_KEY)
  if (!state) return
  const tosId = localStorage.getItem(TERMS_RETURN_PREFIX + state)
  if (!tosId) return
  await httpRequest<unknown>(path + '/terms/confirm', {
    method: 'POST',
    body: JSON.stringify({ state, tosId }),
  })
  localStorage.removeItem(TERMS_RETURN_PREFIX + state)
  localStorage.removeItem(TERMS_SESSION_KEY)
}

export async function loadIndividualKycStatus(): Promise<IndividualKycStatus> {
  return individualKycStatusSchema.parse(await httpRequest<unknown>(path))
}

export async function startIndividualKycTerms(): Promise<string> {
  const result = z
    .object({ url: z.url() })
    .parse(await httpRequest<unknown>(path + '/terms', { method: 'POST' }))
  const url = new URL(result.url)
  if (url.protocol !== 'https:' || url.hostname !== 'app.blindpay.com') {
    throw new Error('A BlindPay retornou um endereço de aceite inválido.')
  }
  const state =
    url.searchParams.get('idempotency_key') ??
    new URL(url.searchParams.get('redirect_url') || window.location.origin).searchParams.get(
      'state',
    )
  if (state) localStorage.setItem(TERMS_SESSION_KEY, state)
  return result.url
}

export async function submitIndividualKyc(
  profile: IndividualKycProfile,
  files: IndividualKycFiles,
): Promise<IndividualKycStatus> {
  const body = new FormData()
  body.append('profile', new Blob([JSON.stringify(profile)], { type: 'application/json' }))
  body.append('idFront', files.idFront)
  if (files.idBack) body.append('idBack', files.idBack)
  body.append('selfie', files.selfie)
  if (files.proofAddress) body.append('proofAddress', files.proofAddress)
  return individualKycStatusSchema.parse(await httpRequest<unknown>(path, { method: 'POST', body }))
}

/** Recomeça um KYC recusado: a BlindPay exige um novo cadastro, com novo aceite dos termos. */
export async function restartIndividualKyc(): Promise<IndividualKycStatus> {
  return individualKycStatusSchema.parse(
    await httpRequest<unknown>(path + '/restart', { method: 'POST' }),
  )
}

const rfiFieldSchema = z.object({
  key: z.string(),
  label: z.string().nullable(),
  required: z.boolean(),
  multiple: z.boolean(),
  documentType: z.string().nullable(),
  options: z.array(z.object({ label: z.string().nullable(), value: z.string() })),
})

const rfiSchema = z.object({
  open: z.boolean(),
  rfiId: z.string().nullable(),
  expiresAt: z.string().nullable(),
  sections: z.array(
    z.object({
      title: z.string().nullable(),
      description: z.string().nullable(),
      supportingDocument: z.string().nullable(),
      fields: z.array(rfiFieldSchema),
    }),
  ),
})

export type IndividualKycRfi = z.infer<typeof rfiSchema>
export type IndividualKycRfiField = z.infer<typeof rfiFieldSchema>
/** Texto (ou opção escolhida) ou lista de URLs de documentos enviados. */
export type RfiAnswer = string | string[]

/** Pedido de informações (RFI) aberto pela BlindPay para o titular. */
export async function loadIndividualKycRfi(): Promise<IndividualKycRfi> {
  return rfiSchema.parse(await httpRequest<unknown>(path + '/rfi'))
}

export async function submitIndividualKycRfi(
  responses: Record<string, RfiAnswer>,
): Promise<IndividualKycStatus> {
  return individualKycStatusSchema.parse(
    await httpRequest<unknown>(path + '/rfi', {
      method: 'POST',
      body: JSON.stringify({ responses }),
    }),
  )
}

/** Envia um documento pedido no RFI e devolve a URL que entra na resposta. */
export async function uploadIndividualKycRfiDocument(file: File): Promise<string> {
  const body = new FormData()
  body.append('file', file)
  const result = z
    .object({ fileUrl: z.url() })
    .parse(await httpRequest<unknown>(path + '/rfi/documents', { method: 'POST', body }))
  return result.fileUrl
}
