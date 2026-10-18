export type LivenessStatus = 'idle' | 'pending' | 'success' | 'failure'

export interface StartLivenessResponse {
  id: string
  sessionId: string
  livenessUrl: string
  validateLivenessToken: string
}

export interface LivenessStatusResponse {
  ready: boolean
  status: string
}
