import { useNavigate } from 'react-router'

import { Button } from '@/shared/components/Button'
import { PATHS } from '@/shared/navigation/paths'

export default function RegistrationComplete() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 px-4 bg-slate-50">
      <div className="mb-8">
        <span className="text-2xl font-bold tracking-widest text-primary">V-STABLE</span>
      </div>

      <div className="bg-white rounded-2xl shadow-md w-full max-w-lg p-8 text-center flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Cadastro enviado</h1>
          <p className="text-gray-600 text-sm">
            Recebemos seus dados e documentos. Nossa equipe de compliance vai analisar o seu
            cadastro e avisaremos assim que a análise for concluída.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button label="Acompanhar status" onClick={() => navigate(PATHS.REGISTER_STATUS)} />
          <Button
            label="Voltar para o início"
            variant="secondary"
            onClick={() => navigate(PATHS.HOME)}
          />
        </div>
      </div>
    </div>
  )
}
