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
  addressLine2: string
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
