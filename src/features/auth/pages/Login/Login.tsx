import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { TwoFactorAuthContainer } from '@/shared/components/TwoFactorAuth'
import { PATHS } from '@/shared/navigation/paths'
import { saveLoginToken } from '@/shared/http/authToken'
import { authService } from '@/features/auth/api/login'
import { isStoredAdmin } from '@/features/auth/model/storedAccount'

import { LoginSchema, type LoginFormData } from '@/features/auth/schemas/auth'

type LoginErrors = Partial<Record<keyof LoginFormData, string>>

function validate(data: LoginFormData): LoginErrors {
  const result = LoginSchema.safeParse(data)
  if (result.success) return {}

  const errors: LoginErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof LoginFormData
    if (!errors[field]) {
      errors[field] = issue.message
    }
  }
  return errors
}

function Login() {
  const [step, setStep] = useState<'CREDENTIALS' | '2FA'>('CREDENTIALS')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [challengeToken, setChallengeToken] = useState<string | undefined>()
  const [otpauthUri, setOtpauthUri] = useState<string | undefined>()
  const [totpCode, setTotpCode] = useState('')
  const [totpError, setTotpError] = useState('')
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<LoginErrors>({})

  const navigate = useNavigate()

  function handleEmailChange(value: string) {
    setEmail(value)
    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
  }

  function handlePasswordChange(value: string) {
    setPassword(value)
    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    const nextErrors = validate({ email, password })
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      const result = await authService.login({
        email,
        password,
      })

      if (result.requires2fa || result.twoFactorRequired) {
        setChallengeToken(result.challengeToken ?? result.tempToken)
        setOtpauthUri(result.otpauthUri)
        setStep('2FA')
        return
      }

      if (result.token) {
        saveLoginToken(result.token)
        void navigate(isStoredAdmin() ? PATHS.ADMIN_CLIENTS : PATHS.HOME, { replace: true })
      }
    } catch (error) {
      setErrors({
        email:
          error instanceof Error && error.message === 'Usuário bloqueado'
            ? 'Usuário bloqueado'
            : 'E-mail ou senha inválidos',
        password: 'E-mail ou senha inválidos',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerify2FA(code: string) {
    if ((code.length !== 6 && code.length < 8) || submitting) return
    setSubmitting(true)
    setTotpError('')
    try {
      const result = await authService.verify2fa({
        challengeToken: challengeToken ?? '',
        code,
      })

      if (!result.token) {
        setTotpError('Código de autenticação inválido ou expirado.')
        return
      }

      saveLoginToken(result.token)
      void navigate(isStoredAdmin() ? PATHS.ADMIN_CLIENTS : PATHS.HOME, { replace: true })
    } catch (error) {
      setTotpError(
        error instanceof Error && error.message
          ? error.message
          : 'Código de autenticação inválido ou expirado.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center min-h-screen">
      <div className="bg-slate-900 min-h-screen w-[760px] flex flex-col items-center justify-center px-18">
        <img src="/favicon.png" alt="logo" />
        <div className="flex flex-col gap-y-[18px]">
          <p className="text-white text-[32px] font-bold">
            Infraestrutura financeira para operações globais.
          </p>
          <p className="text-slate-300 text-[18px] font-semibold">
            Acesse sua conta V-Stable para acompanhar movimentações, usuários e operações em um só
            lugar.
          </p>
        </div>
      </div>
      <div className="bg-white flex flex-col items-center justify-center min-h-screen w-full gap-y-[20px]">
        <div className="flex flex-col gap-y-[10px] text-center">
          <h1 className="text-slate-900 text-[32px] font-bold">
            {step === '2FA' ? 'Verificação de Segurança' : 'Bem-vindo à V-Stable!'}
          </h1>
          {!(step === '2FA' && isRecoveryMode) && (
            <p className="text-slate-500 text-[18px] font-semibold">
              {step === '2FA'
                ? 'Confirme o acesso com o código de 6 dígitos'
                : 'Acesse sua conta com suas credenciais'}
            </p>
          )}
        </div>

        {step === '2FA' ? (
          <div className="flex flex-col w-[560px] gap-y-4">
            <TwoFactorAuthContainer
              otpauthUri={otpauthUri}
              title="Autenticação em duas etapas"
              description={
                otpauthUri
                  ? 'Escaneie o QR Code abaixo com seu aplicativo autenticador ou insira o código de 6 dígitos gerado:'
                  : 'Insira o código de 6 dígitos gerado pelo seu aplicativo autenticador para acessar a conta.'
              }
              value={totpCode}
              onChange={(value) => {
                setTotpCode(value)
                if (totpError) setTotpError('')
              }}
              onVerify={handleVerify2FA}
              onVerifyRecovery={handleVerify2FA}
              onRecoveryModeChange={setIsRecoveryMode}
              error={totpError}
              loading={submitting}
              submitLabel="Verificar e Entrar"
            />
            <Button
              type="button"
              label="Voltar para o login"
              variant="secondary"
              disabled={submitting}
              onClick={() => {
                setStep('CREDENTIALS')
                setTotpCode('')
                setTotpError('')
                setChallengeToken(undefined)
                setOtpauthUri(undefined)
                setIsRecoveryMode(false)
              }}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-y-[50px]">
            <div className="flex flex-col w-[560px] gap-y-[10px]">
              <Input
                id="email"
                type="email"
                label="E-mail"
                placeholder="nome@empresa.com.br"
                value={email}
                error={errors.email}
                onChange={(e) => handleEmailChange(e.target.value)}
              />
              <Input
                id="password"
                type="password"
                label="Senha"
                placeholder="Digite sua senha"
                value={password}
                error={errors.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
              />
            </div>
            <div className="flex flex-col w-[560px] gap-y-[10px]">
              <Button
                type="submit"
                label={submitting ? 'Entrando...' : 'Entrar'}
                variant="primary"
                disabled={submitting}
              />
              <Button
                type="button"
                label="Cadastrar PME"
                variant="secondary"
                onClick={() => navigate(PATHS.REGISTER)}
              />
            </div>
            <div className="flex justify-center -mt-7">
              <Link
                to={PATHS.FORGOT_PASSWORD}
                className="text-[16px] font-medium text-primary hover:text-primary-hover hover:underline transition-colors"
              >
                Esqueci minha senha
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export { Login }
