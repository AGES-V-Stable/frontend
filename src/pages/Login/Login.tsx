import { useState } from "react"
import { useNavigate } from "react-router"

import { Button } from "@/components/Button"
import { Input } from "@/components/Input"


function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const navigate = useNavigate()

  return (
    <>
      <div className="flex items-center min-h-screen">
        <div className="bg-[#0F172A] min-h-screen w-[760px] flex flex-col items-center justify-center px-18">
          <img src="/favicon.png" alt="logo" />
          <div className="flex flex-col gap-y-[18px]">
            <h1 className="text-[#FFFFFF] text-[32px] font-bold">Infraestrutura financeira
              para operações globais.</h1>
            <p className="text-[#CBD5E1] text-[18px] font-semibold">Acesse sua conta V-Stable para acompanhar movimentações, usuários e operações em um só lugar.</p>
          </div>

        </div>
        <div className="bg-[#FFFFFF] flex flex-col items-center justify-center min-h-screen w-full gap-y-[20px]">
          <div className="flex flex-col gap-y-[10px]">
            <h1 className="text-[#0F172A] text-[32px] font-bold" >Bem-vindo à V-Stable!</h1>
            <p className="text-[#64748B] text-[18px] font-semibold">Acesse sua conta com suas credenciais</p>
          </div>
          <div className="flex flex-col gap-y-[50px]">
            <div className="flex flex-col w-[560px] gap-y-[10px]">
              <Input
                label="E-mail"
                placeholder="nome@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Senha"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col w-[560px] gap-y-[10px]">
              <Button label="Entrar" variant="primary" onClick={() => { navigate('/') }} />
              <Button label="Cadastrar PME" variant="secondary" onClick={() => { navigate('/register') }} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export { Login }
