export type LivenessStatus = 'idle' | 'pending' | 'success' | 'failure'

export interface StartLivenessResponse {
  id: string
  sessionId: string | null
  livenessUrl: string
  validateLivenessToken: string | null
}

export interface LivenessStatusResponse {
  ready: boolean
  status: string
}
