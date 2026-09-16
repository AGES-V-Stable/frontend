import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/Button/Button'
import { Input } from '@/components/Input/Input'
import { companyPath, PATHS } from '@/routes/paths'
import { ApiError, createRegistration } from '@/services/registration'
import type { AccessData } from '@/types/registration'
import { RegistrationHeader } from './RegistrationHeader'

function Register() {
  const navigate = useNavigate()
  const locked = useRef(false)
  const idempotencyKey = useRef(crypto.randomUUID())
  const [form, setForm] = useState<AccessData>({
    nomeCompleto: '',
    email: '',
    senha: '',
    confirmarSenha: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof AccessData, string>>>({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)

  function change(field: keyof AccessData, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setServerError('')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const nextErrors: Partial<Record<keyof AccessData, string>> = {}
    if (!form.nomeCompleto.trim()) nextErrors.nomeCompleto = 'Informe seu nome completo'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim()))
      nextErrors.email = 'Informe um e-mail válido'
    if (!/^(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/.test(form.senha))
      nextErrors.senha = 'Use ao menos 8 caracteres, um número e um caractere especial'
    if (form.confirmarSenha !== form.senha)
      nextErrors.confirmarSenha = 'Senha e confirmação não coincidem'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length || locked.current) return

    locked.current = true
    setSaving(true)
    try {
      const progress = await createRegistration(form, idempotencyKey.current)
      navigate(companyPath(progress.token))
    } catch (error) {
      setServerError(
        error instanceof ApiError && error.status < 500
          ? error.message
          : 'Não foi possível iniciar o cadastro. Tente novamente.',
      )
    } finally {
      locked.current = false
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F1F5F9] px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 rounded-xl border border-[#BBCABF] bg-white px-4 py-[30px] md:px-10">
        <RegistrationHeader
          activeStep={0}
          description="Crie seu acesso para iniciar o cadastro institucional."
        />
        <form className="mx-auto grid w-full max-w-xl gap-4 py-4" onSubmit={submit} noValidate>
          <h2 className="text-xl font-bold text-[#0F172A]">Dados de acesso</h2>
          <Input
            label="Nome completo"
            value={form.nomeCompleto}
            onChange={(event) => change('nomeCompleto', event.target.value)}
            error={errors.nomeCompleto}
            autoComplete="name"
            disabled={saving}
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(event) => change('email', event.target.value)}
            error={errors.email}
            autoComplete="email"
            disabled={saving}
          />
          <Input
            label="Senha"
            type="password"
            value={form.senha}
            onChange={(event) => change('senha', event.target.value)}
            error={errors.senha}
            autoComplete="new-password"
            disabled={saving}
          />
          <Input
            label="Confirmar senha"
            type="password"
            value={form.confirmarSenha}
            onChange={(event) => change('confirmarSenha', event.target.value)}
            error={errors.confirmarSenha}
            autoComplete="new-password"
            disabled={saving}
          />
          {serverError && (
            <p role="alert" className="text-sm text-red-600">
              {serverError}
            </p>
          )}
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Link
              to={PATHS.LOGIN}
              className="inline-flex items-center justify-center rounded-lg border border-[#BBCABF] px-6 py-3 text-[#334155]"
            >
              Voltar ao login
            </Link>
            <Button
              type="submit"
              label={saving ? 'Criando acesso...' : 'Continuar'}
              disabled={saving}
            />
          </div>
        </form>
      </div>
    </main>
  )
}

export { Register }
