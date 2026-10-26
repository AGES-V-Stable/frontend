import { useEffect, useState } from 'react'

import { Button } from '@/shared/components/Button'
import { RecoveryCodesContainer, TwoFactorAuthContainer } from '@/shared/components/TwoFactorAuth'
import { twoFactorService } from '@/features/auth'

export interface TwoFactorStepProps {
  kycVerificationId: string
  onContinue: () => void
  onSkip: () => void
}

export function TwoFactorStep({ onContinue, onSkip }: TwoFactorStepProps) {
  const [otpauthUri, setOtpauthUri] = useState<string>('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpError, setTotpError] = useState('')
  const [isActivating, setIsActivating] = useState(false)
  const [setupAttempt, setSetupAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void twoFactorService
      .setup(controller.signal)
      .then((res) => {
        if (!controller.signal.aborted && res.otpauthUri) {
          setOtpauthUri(res.otpauthUri)
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setTotpError(
            err instanceof Error && err.message
              ? err.message
              : 'Não foi possível carregar a configuração do 2FA. Tente novamente.',
          )
        }
      })
    return () => controller.abort()
  }, [setupAttempt])

  async function handleActivate2fa(code: string) {
    if (!otpauthUri || code.length !== 6 || isActivating) return
    setIsActivating(true)
    setTotpError('')
    try {
      const result = await twoFactorService.activate(code)
      if (result.recoveryCodes && result.recoveryCodes.length > 0) {
        setRecoveryCodes(result.recoveryCodes)
      } else {
        onContinue()
      }
    } catch (error) {
      setTotpError(
        error instanceof Error && error.message
          ? error.message
          : 'Código de autenticação inválido ou expirado.',
      )
    } finally {
      setIsActivating(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 px-4 bg-slate-50">
      <div className="mb-8">
        <span className="text-2xl font-bold tracking-widest text-primary">V-STABLE</span>
      </div>

      <div className="bg-white rounded-2xl shadow-md w-full max-w-2xl p-6 md:p-8 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Segurança da Conta (2FA)</h1>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            A autenticação em duas etapas protege sua conta contra acessos não autorizados.
          </p>
        </div>

        <div className="w-full">
          {recoveryCodes && recoveryCodes.length > 0 ? (
            <RecoveryCodesContainer codes={recoveryCodes} onComplete={onContinue} />
          ) : (
            <div className="flex flex-col gap-6">
              <TwoFactorAuthContainer
                otpauthUri={otpauthUri}
                disabled={!otpauthUri}
                allowRecovery={false}
                title="Configuração de Segurança em Duas Etapas (2FA)"
                description="Abra seu aplicativo autenticador no celular (Google Authenticator, Microsoft Authenticator, etc.) e escaneie o QR Code abaixo:"
                value={totpCode}
                onChange={(code) => {
                  setTotpCode(code)
                  if (totpError) setTotpError('')
                }}
                onVerify={handleActivate2fa}
                error={totpError}
                loading={isActivating}
                submitLabel="Ativar 2FA"
              />
              {!otpauthUri && totpError && (
                <Button
                  label="Tentar novamente"
                  variant="secondary"
                  onClick={() => {
                    setTotpError('')
                    setSetupAttempt((attempt) => attempt + 1)
                  }}
                />
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  label="Configurar 2FA mais tarde"
                  variant="secondary"
                  onClick={onSkip}
                  disabled={isActivating}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
