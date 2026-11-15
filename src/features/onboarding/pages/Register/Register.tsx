import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/shared/components/Button/Button'
import { Input } from '@/shared/components/Input/Input'
import { TermsConsent } from '@/shared/components/TermsConsent'
import { PATHS } from '@/shared/navigation/paths'
import type { AccessData } from '@/features/onboarding/types/registration'
import { RegistrationHeader } from '@/features/onboarding/pages/Register/RegistrationHeader'
import { getRegistrationTerms } from '@/features/onboarding/api/onboarding'
import type { RegistrationTerms } from '@/features/onboarding/api/onboarding'

type AccessForm = Omit<AccessData, 'termsVersion'>
type AccessErrors = Partial<Record<keyof AccessForm | 'terms', string>>

function Register() {
  const navigate = useNavigate()
  const locked = useRef(false)
  const [form, setForm] = useState<AccessForm>({
    nomeCompleto: '',
    email: '',
    senha: '',
    confirmarSenha: '',
  })
  const [errors, setErrors] = useState<AccessErrors>({})
  const [terms, setTerms] = useState<RegistrationTerms | null>(null)
  const [termsFailed, setTermsFailed] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    getRegistrationTerms(controller.signal)
      .then(setTerms)
      .catch(() => {
        if (!controller.signal.aborted) setTermsFailed(true)
      })
    return () => controller.abort()
  }, [])

  function change(field: keyof AccessForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const nextErrors: AccessErrors = {}
    if (!form.nomeCompleto.trim()) nextErrors.nomeCompleto = 'Informe seu nome completo.'
    if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(form.email.trim()))
      nextErrors.email = 'Informe um e-mail completo, como nome@empresa.com.br.'
    if (!/^(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/.test(form.senha))
      nextErrors.senha = 'Use ao menos 8 caracteres, um número e um caractere especial.'
    if (form.confirmarSenha !== form.senha)
      nextErrors.confirmarSenha = 'Senha e confirmação não coincidem.'
    if (!termsAccepted)
      nextErrors.terms = 'Aceite os termos de uso e a política de privacidade para continuar.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length || !terms || locked.current) return

    // O cadastro só é efetivado no backend ao final da etapa de representante
    // (submitOnboarding, chamada única); até lá os dados ficam só no estado de
    // navegação entre as páginas do wizard.
    locked.current = true
    const access: AccessData = { ...form, termsVersion: terms.version }
    void navigate(PATHS.REGISTER_COMPANY, { state: { access } })
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 rounded-xl border border-sage-300 bg-white px-4 py-[30px] md:px-10">
        <RegistrationHeader
          activeStep={0}
          description="Crie seu acesso para iniciar o cadastro institucional."
        />
        <form className="mx-auto grid w-full max-w-xl gap-4 py-4" onSubmit={submit} noValidate>
          <h2 className="text-xl font-bold text-slate-900">Dados de acesso</h2>
          <Input
            label="Nome completo"
            value={form.nomeCompleto}
            onChange={(event) => change('nomeCompleto', event.target.value)}
            error={errors.nomeCompleto}
            autoComplete="name"
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(event) => change('email', event.target.value)}
            error={errors.email}
            autoComplete="email"
          />
          <Input
            label="Senha"
            type="password"
            value={form.senha}
            onChange={(event) => change('senha', event.target.value)}
            error={errors.senha}
            autoComplete="new-password"
          />
          <Input
            label="Confirmar senha"
            type="password"
            value={form.confirmarSenha}
            onChange={(event) => change('confirmarSenha', event.target.value)}
            error={errors.confirmarSenha}
            autoComplete="new-password"
          />
          {terms ? (
            <TermsConsent
              terms={terms}
              checked={termsAccepted}
              onChange={(checked) => {
                setTermsAccepted(checked)
                setErrors((current) => ({ ...current, terms: undefined }))
              }}
              error={errors.terms}
            />
          ) : (
            <p role={termsFailed ? 'alert' : 'status'} className="text-sm text-slate-600">
              {termsFailed
                ? 'Não foi possível carregar os termos de uso. Recarregue a página para continuar.'
                : 'Carregando os termos de uso...'}
            </p>
          )}
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Link
              to={PATHS.LOGIN}
              className="inline-flex items-center justify-center rounded-lg border border-sage-300 px-6 py-3 text-slate-700"
            >
              Voltar ao login
            </Link>
            <Button type="submit" label="Continuar" />
          </div>
        </form>
      </div>
    </main>
  )
}

export { Register }
