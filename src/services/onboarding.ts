import type { CompanyData } from '@/types/registration'
import type {
  CurrentOnboarding,
  KycPersonalPayload,
  KycSubmitResult,
  OnboardingResult,
  RepresentativeData,
} from '@/types/onboarding'

import { apiJson, jsonBody } from './api'
import { saveAccessToken } from './authToken'

export { ApiError } from './api'
export { clearAccessToken } from './authToken'

const REPRESENTATIVE_PERSONAL_DATA_KEY = 'vstable:onboarding:representative-personal-data'

/**
 * Registra o representante e a empresa de uma vez (etapa única no backend,
 * chamada só ao final do wizard visual). Cria o usuário, a empresa e a
 * verificação de KYC (pendente) numa mesma transação.
 *
 * Rota pública: não envia o token de uma sessão anterior (um JWT inválido não
 * deve bloquear a criação da conta).
 */
export async function submitOnboarding(representative: RepresentativeData, company: CompanyData) {
  const result = await apiJson<OnboardingResult>('/onboarding', {
    method: 'POST',
    authenticated: false,
    ...jsonBody({
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
  // O onboarding já devolve um JWT: ele vira a sessão do usuário (a mesma usada
  // depois do login) e autentica as etapas de compliance/liveness/KYC.
  saveAccessToken(result.accessToken)
  return result
}

/**
 * Verificação de KYC mais recente do representante logado — permite retomar um
 * cadastro interrompido sem criar outra conta.
 */
export function getCurrentOnboarding(signal?: AbortSignal) {
  return apiJson<CurrentOnboarding>('/onboarding/me', { signal })
}

/**
 * Finaliza o KYC enviando os dados pessoais do representante direto para a
 * Avenia. O backend não persiste esses campos — só usa o documento e o
 * liveness que já estão salvos na verificação de KYC pra completar a chamada.
 */
export function submitKyc(kycVerificationId: string, personal: KycPersonalPayload) {
  return apiJson<KycSubmitResult>(
    `/onboarding/${encodeURIComponent(kycVerificationId)}/compliance/kyc`,
    { method: 'POST', ...jsonBody(personal) },
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
  return raw ? (JSON.parse(raw) as KycPersonalPayload) : null
}

export function clearRepresentativePersonalData(): void {
  sessionStorage.removeItem(REPRESENTATIVE_PERSONAL_DATA_KEY)
}
