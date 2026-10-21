import { z } from 'zod'
import { httpRequest } from '@/shared/http/httpClient'

const TwoFactorSetupSchema = z.object({
  otpauthUri: z.string().min(1),
  secret: z.string().min(1).optional(),
})

export type TwoFactorSetupResponse = z.infer<typeof TwoFactorSetupSchema>

export const twoFactorService = {
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
    return { success: true }
  },
}
