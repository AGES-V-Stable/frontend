import { useState } from 'react'
import { z } from 'zod'
import { useSession } from '@/features/auth'
import { useCompanyRegistration } from '../hooks/useCompanyRegistration'
import type { CompanyData } from '../types/registration'
import { useRepresentativeSubmission } from '../hooks/useRepresentativeSubmission'
import { useComplianceSubmission } from '../hooks/useComplianceSubmission'
import { useAveniaTerms } from '../hooks/useAveniaTerms'
import { AveniaTermsConsent } from '../components/AveniaTermsConsent/AveniaTermsConsent'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'

import LivenessStep from '@/features/onboarding/pages/LivenessStep'
import { CompanyStep } from '@/features/onboarding/pages/Register/CompanyStep'
import ComplianceStep from '@/features/onboarding/pages/Register/ComplianceStep'
import { RepresentativeStep } from '@/features/onboarding/pages/Register/RepresentativeStep'
import { TwoFactorStep } from '@/features/onboarding/pages/Register/TwoFactorStep'

import { PATHS, compliancePath } from '@/shared/navigation/paths'

const AccessState = z.object({
  nomeCompleto: z.string(),
  email: z.string(),
  senha: z.string(),
  confirmarSenha: z.string(),
  termsVersion: z.string().min(1),
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

/**
 * Cadastro da empresa por um usuário autenticado sem vínculo: dados da empresa, depois os do
 * representante. Quem já tem empresa volta ao início.
 */
export function CompanySetupRoute() {
  const navigate = useNavigate()
  const { user } = useSession()
  const [company, setCompany] = useState<CompanyData | null>(null)
  const { saving, serverError, handleContinue } = useCompanyRegistration(company)

  if (user?.companyId) return <Navigate to={PATHS.HOME} replace />
  if (!company) return <CompanyStep onCancel={() => navigate(PATHS.HOME)} onContinue={setCompany} />
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
  const aveniaTerms = useAveniaTerms(kycVerificationId)

  return (
    <ComplianceStep
      onContinue={async (data) => {
        // O aceite dos termos da Avenia vem antes do envio do documento de identidade.
        if (await aveniaTerms.ensureAccepted()) await handleContinue(data)
      }}
      saving={saving}
      serverError={serverError}
      beforeSubmit={
        <AveniaTermsConsent
          terms={aveniaTerms.terms}
          loadFailed={aveniaTerms.loadFailed}
          checked={aveniaTerms.checked}
          error={aveniaTerms.error}
          onCheck={aveniaTerms.check}
          onRetry={aveniaTerms.retry}
        />
      }
    />
  )
}

export function LivenessRoute() {
  const { kycVerificationId } = useParams()
  const navigate = useNavigate()

  return (
    <LivenessStep
      progressoCadastroId={kycVerificationId}
      onContinue={() => navigate(PATHS.REGISTER_STATUS, { replace: true })}
    />
  )
}
