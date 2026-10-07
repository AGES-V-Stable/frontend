export interface RepresentativeAccessData {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export interface RepresentativePersonalData {
  cargoFuncao: string
  participacaoSocietaria: number
  cpf: string
  dateOfBirth: string
  phone: string
  pais: string
  cep: string
  cidade: string
  estado: string
  linhaEndereco: string
}

export type RepresentativeData = RepresentativeAccessData & RepresentativePersonalData

export interface OnboardingResult {
  userId: string
  companyId: string
  kycVerificationId: string
  accessToken: string
}

/**
 * Payload exato enviado para a finalização do KYC (POST .../compliance/kyc).
 * Guardado só em sessionStorage — por decisão de compliance, esses dados
 * pessoais não são persistidos no nosso backend, só repassados para a Avenia.
 */
export interface KycPersonalPayload {
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  taxIdNumber: string
  country: string
  state: string
  city: string
  zipCode: string
  streetAddress: string
}

export type KycStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'

export interface KycSubmitResult {
  aveniaProcessId: string
  status: KycStatus
  resultMessage?: string | null
}
