import { useNavigate } from 'react-router'

import { Button } from '@/components/Button'
import { PATHS } from '@/routes/paths'

export default function RegistrationComplete() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 px-4">
      <div className="mb-8">
        <span className="text-2xl font-bold tracking-widest text-[#059669]">V-STABLE</span>
      </div>

      <div className="bg-white rounded-2xl shadow-md w-full max-w-lg p-8 text-center">
        <h1 className="text-xl font-semibold text-gray-800 mb-4">Cadastro enviado</h1>
        <p className="text-gray-600 text-sm mb-8">
          Recebemos seus dados e documentos. Nossa equipe de compliance vai analisar o seu cadastro
          e avisaremos assim que a análise for concluída.
        </p>
        <Button label="Voltar para o início" onClick={() => navigate(PATHS.HOME)} />
      </div>
    </div>
  )
}
