import type { CompanyData } from '@/types/registration'
import type {
  KycPersonalPayload,
  KycSubmitResult,
  OnboardingResult,
  RepresentativeData,
} from '@/types/onboarding'

import { getAccessToken, saveAccessToken } from './authToken'

export { clearAccessToken } from './authToken'

const API_BASE = '/v1'
const REPRESENTATIVE_PERSONAL_DATA_KEY = 'vstable:onboarding:representative-personal-data'

export class ApiError extends Error {
  public status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken()
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(
      response.status,
      typeof body?.message === 'string'
        ? body.message
        : 'Não foi possível concluir a solicitação. Tente novamente.',
    )
  }
  return response.json() as Promise<T>
}

/**
 * Registra o representante e a empresa de uma vez (etapa única no backend,
 * chamada só ao final do wizard visual). Cria o usuário, a empresa e a
 * verificação de KYC (pendente) numa mesma transação.
 */
export async function submitOnboarding(representative: RepresentativeData, company: CompanyData) {
  const result = await request<OnboardingResult>('/onboarding', {
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
  saveAccessToken(result.accessToken)
  return result
}

/**
 * Finaliza o KYC enviando os dados pessoais do representante direto para a
 * Avenia. O backend não persiste esses campos — só usa o documento e o
 * liveness que já estão salvos na verificação de KYC pra completar a chamada.
 */
export function submitKyc(kycVerificationId: string, personal: KycPersonalPayload) {
  return request<KycSubmitResult>(
    `/onboarding/${encodeURIComponent(kycVerificationId)}/compliance/kyc`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(personal),
    },
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
