import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import type { LoginRedirectState } from '@/routes/guards'
import { compliancePath, livenessPath, PATHS } from '@/routes/paths'
import { ApiError } from '@/services/api'
import {
  clearSession,
  getSessionClaims,
  isAdminSession,
  saveAccessToken,
} from '@/services/authToken'
import { authService, LOGIN_ERRORS } from '@/services/login'
import { getCurrentOnboarding } from '@/services/onboarding'

import { LoginSchema, type LoginFormData } from '@/schemas/auth'

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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<LoginErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const redirectState = (location.state as LoginRedirectState | null) ?? null

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

    const nextErrors = validate({ email, password })
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setFormError(null)
    setSubmitting(true)
    try {
      const { token } = await authService.login({
        email,
        password,
      })

      // Troca de conta: nada da sessão anterior pode sobreviver ao novo login.
      clearSession()
      saveAccessToken(token)

      void navigate(await resolveDestination(), { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setErrors({
          email: LOGIN_ERRORS.INVALID_CREDENTIALS,
          password: LOGIN_ERRORS.INVALID_CREDENTIALS,
        })
      } else {
        setFormError(error instanceof ApiError ? error.message : LOGIN_ERRORS.UNAVAILABLE)
      }
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Administrador → painel admin. Representante → retoma o cadastro se ainda faltar
   * documento ou liveness; senão volta para onde estava ou para a área do cliente.
   */
  async function resolveDestination(): Promise<string> {
    if (isAdminSession(getSessionClaims())) {
      return redirectState?.from?.startsWith('/admin') ? redirectState.from : PATHS.ADMIN_CLIENTS
    }

    try {
      const onboarding = await getCurrentOnboarding()
      if (onboarding.status === 'PENDING') {
        if (!onboarding.documentSubmitted) return compliancePath(onboarding.kycVerificationId)
        if (!onboarding.livenessSubmitted) return livenessPath(onboarding.kycVerificationId)
      }
    } catch {
      // Sem verificação encontrada: segue para a área do cliente.
    }

    if (redirectState?.from && !redirectState.from.startsWith('/admin')) return redirectState.from
    return PATHS.BENEFICIARIES
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
        <div className="flex flex-col gap-y-[10px]">
          <h1 className="text-slate-900 text-[32px] font-bold">Bem-vindo à V-Stable!</h1>
          <p className="text-slate-500 text-[18px] font-semibold">
            Acesse sua conta com suas credenciais
          </p>
        </div>
        {redirectState?.reason === 'expired' && !formError && (
          <p role="status" className="w-[560px] text-sm text-amber-700">
            Sua sessão expirou. Entre novamente para continuar.
          </p>
        )}
        {formError && (
          <p role="alert" className="w-[560px] text-sm text-red-700">
            {formError}
          </p>
        )}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-y-[50px]">
          <div className="flex flex-col w-[560px] gap-y-[10px]">
            <Input
              id="email"
              type="email"
              label="E-mail"
              placeholder="nome@empresa.com.br"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              error={errors.email}
            />
            <Input
              id="password"
              type="password"
              label="Senha"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              error={errors.password}
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
      </div>
    </div>
  )
}

export { Login }
