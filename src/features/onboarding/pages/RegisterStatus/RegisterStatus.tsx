import { useSearchParams } from 'react-router'
import { ComplianceStatusCard } from '@/features/onboarding/components/ComplianceStatusCard/ComplianceStatusCard'
import { ComplianceStatus } from '@/features/onboarding/components/ComplianceStatusCard/ComplianceStatusType'

function RegisterStatus() {
  const [searchParams] = useSearchParams()
  const statusParam = searchParams.get('status')?.toUpperCase()
  const twoFactorParam = searchParams.get('twoFactor')

  const status: ComplianceStatus =
    statusParam === 'APPROVED'
      ? ComplianceStatus.APPROVED
      : statusParam === 'NOT_APPROVED'
        ? ComplianceStatus.NOT_APPROVED
        : ComplianceStatus.IN_REVIEW

  const initialTwoFactorActive = twoFactorParam !== null ? twoFactorParam === 'true' : undefined

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-y-[56px]">
      <ComplianceStatusCard status={status} initialTwoFactorActive={initialTwoFactorActive} />
      <p className="text-slate-500 text-[14px] font-regular">
        Precisa de ajuda? Entre em contato com o suporte da V-Stable.
      </p>
    </div>
  )
}

export { RegisterStatus }