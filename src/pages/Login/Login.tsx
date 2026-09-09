import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { PATHS } from '@/routes/paths'

interface LoginData {
  email: string
  senha: string
}

type LoginErrors = Partial<Record<keyof LoginData, string>>

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(data: LoginData): LoginErrors {
  const errors: LoginErrors = {}
  if (!data.email.trim()) errors.email = 'E-mail é obrigatório'
  else if (!EMAIL_REGEX.test(data.email.trim())) errors.email = 'E-mail inválido'
  if (!data.senha) errors.senha = 'Senha é obrigatória'
  return errors
}

function Login() {
  const navigate = useNavigate()
  const [data, setData] = useState<LoginData>({ email: '', senha: '' })
  const [errors, setErrors] = useState<LoginErrors>({})

  function handleChange(field: keyof LoginData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors = validate(data)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) navigate(PATHS.HOME)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 px-4">
      <div className="mb-8">
        <span className="text-2xl font-bold tracking-widest text-[#059669]">V-STABLE</span>
      </div>

      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8">
        <h1 className="text-xl font-semibold text-gray-800 mb-1">Entrar na sua conta</h1>
        <p className="text-sm text-gray-500 mb-6">
          Acesse a plataforma com seu e-mail e senha cadastrados.
        </p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label="E-mail"
            placeholder="seuemail@empresa.com"
            value={data.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
          />
          <Input
            id="senha"
            type="password"
            label="Senha"
            placeholder="Digite sua senha"
            value={data.senha}
            onChange={(e) => handleChange('senha', e.target.value)}
            error={errors.senha}
          />

          <div className="flex flex-col gap-3 mt-2">
            <Button type="submit" label="Entrar" />
            <Button
              type="button"
              variant="secondary"
              label="Voltar"
              onClick={() => navigate(PATHS.HOME)}
            />
          </div>
        </form>
      </div>
    </div>
  )
}

export { Login }
