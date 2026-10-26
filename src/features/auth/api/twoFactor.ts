import { z } from 'zod'
import { httpRequest } from '@/shared/http/httpClient'
import { getStoredUserId } from '@/shared/http/authToken'

const TwoFactorSetupSchema = z.object({
  otpauthUri: z.string().min(1),
  secret: z.string().min(1).optional(),
})

export type TwoFactorSetupResponse = z.infer<typeof TwoFactorSetupSchema>

const TwoFactorActivateSchema = z.object({
  success: z.boolean(),
  recoveryCodes: z.array(z.string()).optional(),
})

export interface TwoFactorActivateResponse {
  success: boolean
  recoveryCodes?: string[]
}

const getStorageKey = (userId?: string) => (userId ? `vstable_2fa_active_${userId}` : undefined)

export const twoFactorService = {
  isActivated(userId = getStoredUserId()): boolean {
    const key = getStorageKey(userId)
    if (!key) return false
    try {
      return localStorage.getItem(key) === 'true'
    } catch {
      return false
    }
  },

  setActivated(active: boolean, userId = getStoredUserId()): void {
    const key = getStorageKey(userId)
    if (!key) return
    try {
      if (active) {
        localStorage.setItem(key, 'true')
      } else {
        localStorage.removeItem(key)
      }
    } catch {
      // ignore
    }
  },

  async setup(
    currentTotpCodeOrSignal?: string | AbortSignal,
    signal?: AbortSignal,
  ): Promise<TwoFactorSetupResponse> {
    let currentTotpCode: string | undefined
    let effectiveSignal: AbortSignal | undefined

    if (typeof currentTotpCodeOrSignal === 'string') {
      currentTotpCode = currentTotpCodeOrSignal
      effectiveSignal = signal
    } else if (currentTotpCodeOrSignal instanceof AbortSignal) {
      effectiveSignal = currentTotpCodeOrSignal
    } else {
      effectiveSignal = signal
    }

    const body = currentTotpCode ? JSON.stringify({ currentTotpCode }) : undefined
    const headers: Record<string, string> = {}
    if (currentTotpCode) {
      headers['X-Current-Totp'] = currentTotpCode
    }
    const response = await httpRequest<unknown>('/v1/auth/2fa/setup', {
      method: 'POST',
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body,
      signal: effectiveSignal,
    })
    return TwoFactorSetupSchema.parse(response)
  },

  async reconfigure(
    currentTotpCode: string,
    signal?: AbortSignal,
  ): Promise<TwoFactorSetupResponse> {
    return this.setup(currentTotpCode, signal)
  },

  async activate(
    code: string,
    signal?: AbortSignal,
    userId = getStoredUserId(),
  ): Promise<TwoFactorActivateResponse> {
    const response = await httpRequest<unknown>('/v1/auth/2fa/activate', {
      method: 'POST',
      body: JSON.stringify({ code }),
      signal,
    })
    const parsed = TwoFactorActivateSchema.safeParse(response)
    if (!parsed.success || !parsed.data.success) {
      throw new Error('Falha na ativação da autenticação em duas etapas.')
    }
    this.setActivated(true, userId)
    const recoveryCodes =
      Array.isArray(parsed.data.recoveryCodes) && parsed.data.recoveryCodes.length > 0
        ? parsed.data.recoveryCodes
        : undefined
    return { success: true, recoveryCodes }
  },
}

export const activate2fa = (code: string, signal?: AbortSignal, userId?: string) =>
  twoFactorService.activate(code, signal, userId)

export const setup2fa = (currentTotpCodeOrSignal?: string | AbortSignal, signal?: AbortSignal) =>
  twoFactorService.setup(currentTotpCodeOrSignal, signal)

export const reconfigure2fa = (currentTotpCode: string, signal?: AbortSignal) =>
  twoFactorService.reconfigure(currentTotpCode, signal)

export interface RecoveryRequestData {
  email: string
  fullName: string
  documentNumber: string
  reason: string
}

// Contratos de recuperação e de revisão administrativa: os endpoints ainda não existem no
// backend; os schemas registram o formato esperado pelo frontend e rejeitam qualquer outro.
const TwoFactorResetRequestSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string(),
  userEmail: z.string(),
  companyName: z.string().optional(),
  requestedAt: z.string(),
  reason: z.string(),
  documentNumber: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  reviewedAt: z.string().optional(),
})
export type TwoFactorResetRequest = z.infer<typeof TwoFactorResetRequestSchema>
const RecoveryRequestResultSchema = z.object({ success: z.boolean(), id: z.string().min(1) })
const ApproveResetResultSchema = z.object({
  success: z.boolean(),
  withdrawalLockedUntil: z.string(),
})
const RejectResetResultSchema = z.object({ success: z.boolean() })

export async function request2faRecovery(
  data: RecoveryRequestData,
  signal?: AbortSignal,
): Promise<z.infer<typeof RecoveryRequestResultSchema>> {
  return RecoveryRequestResultSchema.parse(
    await httpRequest<unknown>(
      '/v1/auth/2fa/recovery-request',
      { method: 'POST', body: JSON.stringify(data), signal },
      false,
    ),
  )
}

export async function get2faResetRequests(signal?: AbortSignal): Promise<TwoFactorResetRequest[]> {
  return z
    .array(TwoFactorResetRequestSchema)
    .parse(await httpRequest<unknown>('/v1/admin/2fa-recovery-requests', { signal }))
}

export async function approve2faReset(
  requestId: string,
  signal?: AbortSignal,
): Promise<z.infer<typeof ApproveResetResultSchema>> {
  return ApproveResetResultSchema.parse(
    await httpRequest<unknown>(
      `/v1/admin/2fa-recovery-requests/${encodeURIComponent(requestId)}/approve`,
      { method: 'POST', signal },
    ),
  )
}

export async function reject2faReset(
  requestId: string,
  reason?: string,
  signal?: AbortSignal,
): Promise<z.infer<typeof RejectResetResultSchema>> {
  return RejectResetResultSchema.parse(
    await httpRequest<unknown>(
      `/v1/admin/2fa-recovery-requests/${encodeURIComponent(requestId)}/reject`,
      { method: 'POST', body: JSON.stringify({ reason }), signal },
    ),
  )
}
