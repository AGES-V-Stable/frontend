import { useState } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { PATHS } from '@/routes/paths'

interface LoginData {
  email: string
  password: string
}

type LoginErrors = Partial<Record<keyof LoginData, string>>

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(data: LoginData): LoginErrors {
  const errors: LoginErrors = {}
  if (!data.email.trim()) errors.email = 'E-mail é obrigatório'
  else if (!EMAIL_REGEX.test(data.email.trim())) errors.email = 'E-mail inválido'
  if (!data.password) errors.password = 'Senha é obrigatória'
  return errors
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors = validate({ email, password })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) navigate('/')
  }

  return (
    <div className="flex items-center min-h-screen">
      <div className="bg-[#0F172A] min-h-screen w-[760px] flex flex-col items-center justify-center px-18">
        <img src="/favicon.png" alt="logo" />
        <div className="flex flex-col gap-y-[18px]">
          <h1 className="text-[#FFFFFF] text-[32px] font-bold">
            Infraestrutura financeira para operações globais.
          </h1>
          <p className="text-[#CBD5E1] text-[18px] font-semibold">
            Acesse sua conta V-Stable para acompanhar movimentações, usuários e operações em um só
            lugar.
          </p>
        </div>
      </div>
      <div className="bg-[#FFFFFF] flex flex-col items-center justify-center min-h-screen w-full gap-y-[20px]">
        <div className="flex flex-col gap-y-[10px]">
          <h1 className="text-[#0F172A] text-[32px] font-bold">Bem-vindo à V-Stable!</h1>
          <p className="text-[#64748B] text-[18px] font-semibold">
            Acesse sua conta com suas credenciais
          </p>
        </div>
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
            <Button type="submit" label="Entrar" variant="primary" />
            <Button
              type="button"
              label="Cadastrar PME"
              variant="secondary"
              onClick={() => navigate(PATHS.REGISTER)}
            />
          </div>
        </form>
      </div>
    </div>
  )
}

export { Login }
