import { useEffect, useState } from 'react'
import { ApiError, getCompanyComplianceStatus, getCurrentOnboarding } from '../api/onboarding'
import { pendingOnboardingPath, registrationCardStatus } from '../model/registrationStatus'
import type { ComplianceStatus } from '../components/ComplianceStatusCard/ComplianceStatusType'

export type RegistrationStatusState =
  | { kind: 'loading' }
  | { kind: 'unauthenticated' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | { kind: 'resume'; path: string }
  | { kind: 'status'; status: ComplianceStatus }

/** Carrega a situação real do cadastro; `reload` consulta o backend novamente. */
export function useRegistrationStatus() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<RegistrationStatusState>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    async function load(): Promise<RegistrationStatusState> {
      const onboarding = await getCurrentOnboarding(signal)
      const path = pendingOnboardingPath(onboarding)
      if (path) return { kind: 'resume', path }
      // O status da empresa complementa o KYC; sem ele, o cadastro segue em análise.
      const company = onboarding.companyId
        ? await getCompanyComplianceStatus(onboarding.companyId, signal).catch(() => null)
        : null
      return { kind: 'status', status: registrationCardStatus(onboarding.status, company) }
    }
    load().then(
      (next) => {
        if (!signal.aborted) setState(next)
      },
      (error: unknown) => {
        if (signal.aborted) return
        if (error instanceof ApiError && error.status === 401) setState({ kind: 'unauthenticated' })
        else if (error instanceof ApiError && error.status === 404) setState({ kind: 'not-found' })
        else setState({ kind: 'error' })
      },
    )
    return () => controller.abort()
  }, [attempt])

  return {
    state,
    reload: () => {
      setState({ kind: 'loading' })
      setAttempt((value) => value + 1)
    },
  }
}
