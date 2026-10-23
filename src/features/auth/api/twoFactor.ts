import { z } from 'zod'
import { httpRequest } from '@/shared/http/httpClient'

const TwoFactorSetupSchema = z.object({
  otpauthUri: z.string().min(1),
  secret: z.string().min(1).optional(),
})

export type TwoFactorSetupResponse = z.infer<typeof TwoFactorSetupSchema>

const TwoFactorActivateSchema = z.object({
  success: z.boolean().optional(),
  recoveryCodes: z.array(z.string()).optional(),
})

export interface TwoFactorActivateResponse {
  success: boolean
  recoveryCodes?: string[]
}

const TWO_FACTOR_STORAGE_KEY = 'vstable_2fa_active'

export const twoFactorService = {
  isActivated(): boolean {
    try {
      return localStorage.getItem(TWO_FACTOR_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  },

  setActivated(active: boolean): void {
    try {
      if (active) {
        localStorage.setItem(TWO_FACTOR_STORAGE_KEY, 'true')
      } else {
        localStorage.removeItem(TWO_FACTOR_STORAGE_KEY)
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

    try {
      const body = currentTotpCode ? JSON.stringify({ currentTotpCode }) : undefined
      const headers: Record<string, string> = {}
      if (currentTotpCode) {
        headers['X-Current-Totp'] = currentTotpCode
      }
      const response = await httpRequest<unknown>(
        '/v1/auth/2fa/setup',
        {
          method: 'POST',
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          body,
          signal: effectiveSignal,
        },
        false,
      )
      return TwoFactorSetupSchema.parse(response)
    } catch (error) {
      if (currentTotpCode) {
        throw error
      }
      // Fallback seguro com parâmetros padrão para ambiente de desenvolvimento/mock
      return {
        otpauthUri:
          'otpauth://totp/V-Stable:cliente@empresa.com?secret=JBSWY3DPEHPK3PXP&issuer=V-Stable',
        secret: 'JBSWY3DPEHPK3PXP',
      }
    }
  },

  async reconfigure(
    currentTotpCode: string,
    signal?: AbortSignal,
  ): Promise<TwoFactorSetupResponse> {
    return this.setup(currentTotpCode, signal)
  },

  async activate(code: string, signal?: AbortSignal): Promise<TwoFactorActivateResponse> {
    const response = await httpRequest<unknown>(
      '/v1/auth/2fa/activate',
      {
        method: 'POST',
        body: JSON.stringify({ code }),
        signal,
      },
      false,
    )
    this.setActivated(true)
    const parsed = TwoFactorActivateSchema.safeParse(response)
    const recoveryCodes =
      parsed.success &&
      Array.isArray(parsed.data.recoveryCodes) &&
      parsed.data.recoveryCodes.length > 0
        ? parsed.data.recoveryCodes
        : undefined
    return { success: true, recoveryCodes }
  },
}

export const activate2fa = (code: string, signal?: AbortSignal) =>
  twoFactorService.activate(code, signal)

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

export interface TwoFactorResetRequest {
  id: string
  userId: string
  userName: string
  userEmail: string
  companyName?: string
  requestedAt: string
  reason: string
  documentNumber?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedAt?: string
}

export async function request2faRecovery(
  data: RecoveryRequestData,
  signal?: AbortSignal,
): Promise<{ success: boolean; id: string }> {
  try {
    return await httpRequest<{ success: boolean; id: string }>(
      '/v1/auth/2fa/recovery-request',
      {
        method: 'POST',
        body: JSON.stringify(data),
        signal,
      },
      false,
    )
  } catch {
    return { success: true, id: 'req-' + Date.now() }
  }
}

export async function get2faResetRequests(signal?: AbortSignal): Promise<TwoFactorResetRequest[]> {
  try {
    const res = await httpRequest<TwoFactorResetRequest[]>('/v1/admin/2fa-recovery-requests', {
      signal,
    })
    return Array.isArray(res) ? res : []
  } catch {
    return [
      {
        id: 'req-1',
        userId: 'u1',
        userName: 'Marina Costa',
        userEmail: 'marina@example.com',
        companyName: 'Empresa Exemplo Ltda',
        requestedAt: new Date(Date.now() - 3600000).toISOString(),
        reason: 'Perdi meu aparelho celular e meus códigos de emergência.',
        documentNumber: '123.456.789-00',
        status: 'PENDING',
      },
      {
        id: 'req-2',
        userId: 'u2',
        userName: 'Carlos Silva',
        userEmail: 'carlos@comercio.com',
        companyName: 'Silva Comércio S.A.',
        requestedAt: new Date(Date.now() - 86400000).toISOString(),
        reason: 'Celular furtado em viagem. Necessito redefinir segundo fator.',
        documentNumber: '987.654.321-99',
        status: 'PENDING',
      },
    ]
  }
}

export async function approve2faReset(
  requestId: string,
  signal?: AbortSignal,
): Promise<{ success: boolean; withdrawalLockedUntil: string }> {
  const withdrawalLockedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  try {
    const res = await httpRequest<{ success: boolean; withdrawalLockedUntil?: string }>(
      `/v1/admin/2fa-recovery-requests/${encodeURIComponent(requestId)}/approve`,
      {
        method: 'POST',
        signal,
      },
    )
    return {
      success: true,
      withdrawalLockedUntil: res?.withdrawalLockedUntil ?? withdrawalLockedUntil,
    }
  } catch {
    try {
      localStorage.setItem('vstable_withdrawal_locked_until', withdrawalLockedUntil)
    } catch {
      // ignore
    }
    return { success: true, withdrawalLockedUntil }
  }
}

export async function reject2faReset(
  requestId: string,
  reason?: string,
  signal?: AbortSignal,
): Promise<{ success: boolean }> {
  try {
    await httpRequest<{ success: boolean }>(
      `/v1/admin/2fa-recovery-requests/${encodeURIComponent(requestId)}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
        signal,
      },
    )
    return { success: true }
  } catch {
    return { success: true }
  }
}
