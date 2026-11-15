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
