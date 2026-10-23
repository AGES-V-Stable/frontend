import { z } from 'zod'
import { useRepresentativeSubmission } from '../hooks/useRepresentativeSubmission'
import { useComplianceSubmission } from '../hooks/useComplianceSubmission'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'

import LivenessStep from '@/features/onboarding/pages/LivenessStep'
import { CompanyStep } from '@/features/onboarding/pages/Register/CompanyStep'
import ComplianceStep from '@/features/onboarding/pages/Register/ComplianceStep'
import { RepresentativeStep } from '@/features/onboarding/pages/Register/RepresentativeStep'
import { TwoFactorStep } from '@/features/onboarding/pages/Register/TwoFactorStep'

import { PATHS, compliancePath, registrationCompletePath } from '@/shared/navigation/paths'

const AccessState = z.object({
  nomeCompleto: z.string(),
  email: z.string(),
  senha: z.string(),
  confirmarSenha: z.string(),
})
const CompanyState = z.object({
  razaoSocial: z.string(),
  pais: z.string(),
  cnpj: z.string(),
  cep: z.string(),
  cidade: z.string(),
  estado: z.string(),
})

export function CompanyRoute() {
  const location = useLocation()
  const navigate = useNavigate()
  const parsed = z.object({ access: AccessState }).safeParse(location.state)
  const state = parsed.success ? parsed.data : null

  if (!state?.access) return <Navigate to={PATHS.REGISTER} replace />

  return (
    <CompanyStep
      onCancel={() => navigate(PATHS.REGISTER)}
      onContinue={(company) =>
        navigate(PATHS.REGISTER_REPRESENTATIVE, { state: { access: state.access, company } })
      }
    />
  )
}

export function RepresentativeRoute() {
  const location = useLocation()
  const parsed = z.object({ access: AccessState, company: CompanyState }).safeParse(location.state)
  const state = parsed.success ? parsed.data : null
  const { saving, serverError, handleContinue } = useRepresentativeSubmission(
    state?.access,
    state?.company,
  )
  if (!state?.access || !state?.company) return <Navigate to={PATHS.REGISTER} replace />

  return (
    <RepresentativeStep onContinue={handleContinue} saving={saving} serverError={serverError} />
  )
}

export function TwoFactorRoute() {
  const { kycVerificationId } = useParams()
  const navigate = useNavigate()

  return (
    <TwoFactorStep
      kycVerificationId={kycVerificationId!}
      onContinue={() => navigate(compliancePath(kycVerificationId!))}
      onSkip={() => navigate(compliancePath(kycVerificationId!))}
    />
  )
}

export function ComplianceRoute() {
  const { kycVerificationId } = useParams()
  const { saving, serverError, handleContinue } = useComplianceSubmission(kycVerificationId)

  return <ComplianceStep onContinue={handleContinue} saving={saving} serverError={serverError} />
}

export function LivenessRoute() {
  const { kycVerificationId } = useParams()
  const navigate = useNavigate()

  return (
    <LivenessStep
      progressoCadastroId={kycVerificationId}
      onContinue={() => navigate(registrationCompletePath(kycVerificationId!), { replace: true })}
    />
  )
}