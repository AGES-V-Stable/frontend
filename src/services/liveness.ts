import type { LivenessStatus, StartLivenessResponse } from '@/types/liveness'

import { API_BASE_URL } from './apiConfig'
import { httpRequest } from './httpClient'

const LIVENESS_ID_STORAGE_KEY = 'vstable:liveness:id'
const LIVENESS_STATUS_STORAGE_KEY = 'vstable:liveness:status'

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
    `${API_BASE_URL}/v1/cadastros/${progressoCadastroId}/compliance/liveness`,
    { method: 'POST' },
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
    `${API_BASE_URL}/v1/cadastros/${progressoCadastroId}/compliance/liveness`,
    {
      method: 'PUT',
      body: JSON.stringify({ livenessId }),
    },
  )
}

export function saveLivenessSession(id: string, status: LivenessStatus): void {
  sessionStorage.setItem(LIVENESS_ID_STORAGE_KEY, id)
  sessionStorage.setItem(LIVENESS_STATUS_STORAGE_KEY, status)
}

export function getLivenessId(): string | null {
  return sessionStorage.getItem(LIVENESS_ID_STORAGE_KEY)
}

export function getLivenessStatus(): LivenessStatus {
  const status = sessionStorage.getItem(LIVENESS_STATUS_STORAGE_KEY)
  return (KNOWN_STATUSES as string[]).includes(status ?? '') ? (status as LivenessStatus) : 'idle'
}

export function setLivenessStatus(status: LivenessStatus): void {
  sessionStorage.setItem(LIVENESS_STATUS_STORAGE_KEY, status)
}

export function clearLivenessSession(): void {
  sessionStorage.removeItem(LIVENESS_ID_STORAGE_KEY)
  sessionStorage.removeItem(LIVENESS_STATUS_STORAGE_KEY)
}
