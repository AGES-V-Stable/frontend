import { useSession } from '@/features/auth'
import { useNavigate } from 'react-router'
import { Button } from '@/shared/components/Button'
import { BeneficiaryList } from '@/features/beneficiaries/components/BeneficiaryList'
import { PATHS } from '@/shared/navigation/paths'

export function BeneficiariesLanding() {
  const navigate = useNavigate()
  const { user } = useSession()
  const companyId = user?.companyId

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-8 md:px-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-slate-900">Beneficiários</h1>
            <p className="text-xs text-slate-500">
              Cadastre e gerencie os beneficiários das suas transferências internacionais.
            </p>
          </div>
          <div className="md:w-[220px]">
            <Button
              label="Novo beneficiário"
              onClick={() => navigate(PATHS.BENEFICIARIES_NEW)}
              className="h-12 font-medium"
            />
          </div>
        </header>

        {companyId ? (
          <BeneficiaryList title="Meus beneficiários" subtitle="" forceCompanyId={companyId} />
        ) : (
          <p className="text-sm text-gray-500">Carregando dados da conta...</p>
        )}
      </div>
    </>
  )
}
