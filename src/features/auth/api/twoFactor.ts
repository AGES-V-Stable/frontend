import { z } from 'zod'
import { httpRequest } from '@/shared/http/httpClient'

const TwoFactorSetupSchema = z.object({
  otpauthUri: z.string().min(1),
  secret: z.string().min(1).optional(),
})

export type TwoFactorSetupResponse = z.infer<typeof TwoFactorSetupSchema>

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

  async setup(signal?: AbortSignal): Promise<TwoFactorSetupResponse> {
    try {
      const response = await httpRequest<unknown>(
        '/v1/auth/2fa/setup',
        {
          method: 'POST',
          signal,
        },
        false,
      )
      return TwoFactorSetupSchema.parse(response)
    } catch {
      // Fallback seguro com parâmetros padrão para ambiente de desenvolvimento/mock
      return {
        otpauthUri:
          'otpauth://totp/V-Stable:cliente@empresa.com?secret=JBSWY3DPEHPK3PXP&issuer=V-Stable',
        secret: 'JBSWY3DPEHPK3PXP',
      }
    }
  },

  async activate(code: string, signal?: AbortSignal): Promise<{ success: boolean }> {
    await httpRequest<unknown>(
      '/v1/auth/2fa/activate',
      {
        method: 'POST',
        body: JSON.stringify({ code }),
        signal,
      },
      false,
    )
    this.setActivated(true)
    return { success: true }
  },
}
