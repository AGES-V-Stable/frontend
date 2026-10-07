import { ComplianceStatusCard } from '@/components/ComplianceStatusCard/ComplianceStatusCard'

function RegisterStatus() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-y-[56px]">
      <ComplianceStatusCard status="IN_REVIEW" />
      <p className="text-slate-500 text-sm font-regular">
        Precisa de ajuda? Entre em contato com o suporte da V-Stable.
      </p>
    </div>
  )
}

export { RegisterStatus }
