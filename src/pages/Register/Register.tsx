import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/Button/Button'
import { Input } from '@/components/Input/Input'
import { PATHS } from '@/routes/paths'
import type { AccessData } from '@/types/registration'
import { RegistrationHeader } from './RegistrationHeader'

function Register() {
  const navigate = useNavigate()
  const locked = useRef(false)
  const [form, setForm] = useState<AccessData>({
    nomeCompleto: '',
    email: '',
    senha: '',
    confirmarSenha: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof AccessData, string>>>({})

  function change(field: keyof AccessData, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const nextErrors: Partial<Record<keyof AccessData, string>> = {}
    if (!form.nomeCompleto.trim()) nextErrors.nomeCompleto = 'Informe seu nome completo'
    if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(form.email.trim()))
      nextErrors.email = 'Informe um e-mail válido'
    if (!/^(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/.test(form.senha))
      nextErrors.senha = 'Use ao menos 8 caracteres, um número e um caractere especial'
    if (form.confirmarSenha !== form.senha)
      nextErrors.confirmarSenha = 'Senha e confirmação não coincidem'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length || locked.current) return

    // O cadastro só é efetivado no backend ao final da etapa de representante
    // (submitOnboarding, chamada única); até lá os dados ficam só no estado de
    // navegação entre as páginas do wizard.
    locked.current = true
    void navigate(PATHS.REGISTER_COMPANY, { state: { access: form } })
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
