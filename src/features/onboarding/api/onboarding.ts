import { OnboardingResultSchema, KycResultSchema, PersonalDataSchema } from '../schemas/responses'
import type { CompanyData } from '@/features/onboarding/types/registration'
import type { KycPersonalPayload, RepresentativeData } from '@/features/onboarding/types/onboarding'

import { saveAccessToken } from '@/shared/http/authToken'

export { clearAccessToken } from '@/shared/http/authToken'

const API_BASE = '/v1'
const REPRESENTATIVE_PERSONAL_DATA_KEY = 'vstable:onboarding:representative-personal-data'

export { ApiError } from '@/shared/http/httpClient'
import { httpRequest } from '@/shared/http/httpClient'

function request<T>(path: string, options?: RequestInit): Promise<T> {
  return httpRequest<T>(`${API_BASE}${path}`, options)
}

/**
 * Registra o representante e a empresa de uma vez (etapa única no backend,
 * chamada só ao final do wizard visual). Cria o usuário, a empresa e a
 * verificação de KYC (pendente) numa mesma transação.
 */
export async function submitOnboarding(representative: RepresentativeData, company: CompanyData) {
  const result = await request<unknown>('/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: representative.fullName.trim(),
      email: representative.email.trim(),
      password: representative.password,
      confirmPassword: representative.confirmPassword,
      legalName: company.razaoSocial.trim(),
      cnpj: company.cnpj.replace(/\D/g, ''),
      country: company.pais.trim(),
      zipCode:
        company.pais.trim().toLowerCase() === 'brasil'
          ? company.cep.replace(/\D/g, '')
          : company.cep.trim(),
      city: company.cidade.trim() || undefined,
      state: company.estado.trim(),
    }),
  })
  // O onboarding já devolve um JWT (não existe outro passo de login antes das
  // etapas de compliance/liveness/KYC, que exigem autenticação no backend).
  const validated = OnboardingResultSchema.parse(result)
  saveAccessToken(validated.accessToken)
  return validated
}

/**
 * Finaliza o KYC enviando os dados pessoais do representante direto para a
 * Avenia. O backend não persiste esses campos — só usa o documento e o
 * liveness que já estão salvos na verificação de KYC pra completar a chamada.
 */
export async function submitKyc(kycVerificationId: string, personal: KycPersonalPayload) {
  return KycResultSchema.parse(
    await request<unknown>(`/onboarding/${encodeURIComponent(kycVerificationId)}/compliance/kyc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(personal),
    }),
  )
}

/**
 * Guarda os dados pessoais do representante (nome, e-mail, telefone,
 * nascimento, CPF, endereço) só em sessionStorage — por decisão de
 * compliance, esses dados não são persistidos no nosso backend. Ficam
 * disponíveis para a etapa de finalização do KYC (submitKyc), que os envia
 * direto para a Avenia.
 */
export function saveRepresentativePersonalData(data: KycPersonalPayload): void {
  sessionStorage.setItem(REPRESENTATIVE_PERSONAL_DATA_KEY, JSON.stringify(data))
}

export function getRepresentativePersonalData(): KycPersonalPayload | null {
  const raw = sessionStorage.getItem(REPRESENTATIVE_PERSONAL_DATA_KEY)
  if (!raw) return null
  try {
    const parsed = PersonalDataSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function clearRepresentativePersonalData(): void {
  sessionStorage.removeItem(REPRESENTATIVE_PERSONAL_DATA_KEY)
}
