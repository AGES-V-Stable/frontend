import type {
  LivenessStatus,
  LivenessStatusResponse,
  StartLivenessResponse,
} from '@/types/liveness'

import { API_BASE_URL } from './apiConfig'
import { httpRequest } from './httpClient'

export const LIVENESS_ID_STORAGE_KEY = 'vstable:liveness:id'
export const LIVENESS_STATUS_STORAGE_KEY = 'vstable:liveness:status'

const KNOWN_STATUSES: LivenessStatus[] = ['idle', 'pending', 'success', 'failure']

/**
 * Inicia a verificação facial (liveness). O backend assina e faz a chamada à
 * Avenia (POST /v2/documents/ com documentType SELFIE-FROM-LIVENESS) e devolve
 * o id e o link de redirecionamento — a assinatura da chamada à Avenia exige a
 * chave privada da API Key, que não pode viver no frontend.
 */
export async function startLivenessVerification(
  progressoCadastroId: string,
): Promise<StartLivenessResponse> {
  return httpRequest<StartLivenessResponse>(
    `${API_BASE_URL}/v1/onboarding/${progressoCadastroId}/compliance/liveness`,
    { method: 'POST' },
  )
}

/**
 * Consulta se a verificação de liveness já foi concluída. A Avenia não avisa a
 * gente automaticamente (sem redirect de volta, sem webhook no front) — por
 * isso essa consulta é acionada manualmente pelo usuário (botão "Verificar
 * conclusão"), não por um retorno automático.
 */
export async function checkLivenessStatus(
  progressoCadastroId: string,
  livenessId: string,
): Promise<LivenessStatusResponse> {
  return httpRequest<LivenessStatusResponse>(
    `${API_BASE_URL}/v1/onboarding/${progressoCadastroId}/compliance/liveness/status?livenessId=${encodeURIComponent(livenessId)}`,
    { method: 'GET' },
  )
}

/**
 * Envia o id da verificação de liveness para o backend ao final do wizard,
 * concluindo a etapa de compliance do progresso de cadastro.
 */
export async function submitLivenessResult(
  progressoCadastroId: string,
  livenessId: string,
): Promise<void> {
  await httpRequest<void>(
    `${API_BASE_URL}/v1/onboarding/${progressoCadastroId}/compliance/liveness`,
    {
      method: 'PUT',
      body: JSON.stringify({ livenessId }),
    },
  )
}

export function saveLivenessSession(id: string, status: LivenessStatus): void {
  localStorage.setItem(LIVENESS_ID_STORAGE_KEY, id)
  localStorage.setItem(LIVENESS_STATUS_STORAGE_KEY, status)
}

export function getLivenessId(): string | null {
  return localStorage.getItem(LIVENESS_ID_STORAGE_KEY)
}

export function getLivenessStatus(): LivenessStatus {
  const status = localStorage.getItem(LIVENESS_STATUS_STORAGE_KEY)
  return (KNOWN_STATUSES as string[]).includes(status ?? '') ? (status as LivenessStatus) : 'idle'
}

export function setLivenessStatus(status: LivenessStatus): void {
  localStorage.setItem(LIVENESS_STATUS_STORAGE_KEY, status)
}

export function clearLivenessSession(): void {
  localStorage.removeItem(LIVENESS_ID_STORAGE_KEY)
  localStorage.removeItem(LIVENESS_STATUS_STORAGE_KEY)
}
