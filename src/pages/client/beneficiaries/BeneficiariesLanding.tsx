import { useNavigate } from 'react-router'
import { Button } from '@/components/Button'
import { ClientLayout } from '../ClientLayout'
import { PATHS } from '@/routes/paths'

export function BeneficiariesLanding() {
  const navigate = useNavigate()

  return (
    <ClientLayout activeItemId="beneficiaries">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-4 py-8 md:px-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#0F172A]">Beneficiários</h1>
          <p className="text-xs text-[#64748B]">
            Cadastre e gerencie os beneficiários das suas transferências internacionais.
          </p>
        </header>
        <div className="md:w-[220px]">
          <Button
            label="Novo beneficiário"
            onClick={() => navigate(PATHS.BENEFICIARIES_NEW)}
            className="h-12 font-medium"
          />
        </div>
      </div>
    </ClientLayout>
  )
}
