import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/Button'
import { ComplianceStatusCard } from '@/components/ComplianceStatusCard/ComplianceStatusCard'
import { compliancePath, livenessPath } from '@/routes/paths'
import { getCompanyComplianceStatus } from '@/services/companies'
import { getCurrentOnboarding } from '@/services/onboarding'
import type { CurrentOnboarding } from '@/types/onboarding'
import {
  complianceStatusLabel,
  toCardStatus,
  type BackendComplianceStatus,
} from '@/utils/complianceStatus'

interface StatusState {
  onboarding: CurrentOnboarding
  companyStatus: BackendComplianceStatus | null
}

function RegisterStatus() {
  const navigate = useNavigate()
  const [state, setState] = useState<StatusState | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        const onboarding = await getCurrentOnboarding(controller.signal)
        const company = onboarding.companyId
          ? await getCompanyComplianceStatus(onboarding.companyId, controller.signal).catch(
              () => null,
            )
          : null
        if (!controller.signal.aborted) {
          setState({ onboarding, companyStatus: company?.overallStatus ?? null })
        }
      } catch {
        if (!controller.signal.aborted)
          setError('Não foi possível carregar a situação do seu cadastro.')
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  const onboarding = state?.onboarding
  const pendingStep =
    onboarding && onboarding.status === 'PENDING'
      ? !onboarding.documentSubmitted
        ? compliancePath(onboarding.kycVerificationId)
        : !onboarding.livenessSubmitted
          ? livenessPath(onboarding.kycVerificationId)
          : null
      : null

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-y-[32px]">
      {!state && !error && (
        <p role="status" className="text-sm text-slate-500">
          Carregando situação cadastral...
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {state && (
        <>
          <ComplianceStatusCard
            status={toCardStatus(state.onboarding.status, state.companyStatus)}
          />
          <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-600">
            <dt>Identidade do representante</dt>
            <dd className="font-medium text-slate-900">
              {complianceStatusLabel(state.onboarding.status)}
            </dd>
            <dt>Análise da empresa</dt>
            <dd className="font-medium text-slate-900">
              {complianceStatusLabel(state.companyStatus)}
            </dd>
          </dl>
          {pendingStep && (
            <div className="w-[280px]">
              <Button label="Continuar cadastro" onClick={() => navigate(pendingStep)} />
            </div>
          )}
        </>
      )}
      <p className="text-slate-500 text-[14px] font-regular">
        Precisa de ajuda? Entre em contato com o suporte da V-Stable.
      </p>
    </div>
  )
}

export { RegisterStatus }
