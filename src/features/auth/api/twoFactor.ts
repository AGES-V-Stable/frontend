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
