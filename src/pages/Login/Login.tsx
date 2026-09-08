import { Input } from "@/components/Input"

function Login() {
  return (
    <>
      <div className="flex items-center min-h-screen">
        <div className="bg-[#0F172A] min-h-screen w-[760px] flex items-center justify-center">div da esquerda azul escuro</div>
        <div className="bg-[#FFFFFF] flex flex-col items-center justify-center min-h-screen w-full gap-y-[20px]">
          <div className="flex flex-col gap-y-[10px]">
            <h1 className="text-[#0F172A] text-[32px] font-bold" >Bem-vindo à V-Stable!</h1>
            <p className="text-[#64748B] text-[18px] font-semibold">Acesse sua conta com suas credenciais</p>
          </div>
          <div className="flex flex-col w-[560px] gap-y-[10px]">
            <Input label="E-mail" placeholder="nome@empresa.com.br" value="" onChange={(e) => { }} />
            <Input label="Senha" placeholder="Digite sua senha" value="" onChange={(e) => { }} />
          </div>

        </div>
      </div>
    </>
  )
}

export { Login }
