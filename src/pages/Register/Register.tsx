import { useState } from 'react'
import { useNavigate } from 'react-router'

import { compliancePath, PATHS } from '@/routes/paths'
import { ApiError, saveRepresentativePersonalData, submitOnboarding } from '@/services/onboarding'
import type { RepresentativeData } from '@/types/onboarding'
import type { CompanyData } from '@/types/registration'

import { CompanyStep } from './CompanyStep'
import { RepresentativeStep } from './RepresentativeStep'

function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState<0 | 1>(0)
  const [representative, setRepresentative] = useState<RepresentativeData | null>(null)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')

  async function handleCompanyContinue(company: CompanyData) {
    if (!representative) return

    setSaving(true)
    setServerError('')
    try {
      const result = await submitOnboarding(representative, company)
      const isBrazil = representative.pais.trim().toLowerCase() === 'brasil'
      saveRepresentativePersonalData({
        fullName: representative.fullName.trim(),
        email: representative.email.trim(),
        phone: representative.phone.replace(/\D/g, ''),
        dateOfBirth: representative.dateOfBirth,
        taxIdNumber: representative.cpf.replace(/\D/g, ''),
        country: representative.pais.trim(),
        state: representative.estado.trim(),
        city: representative.cidade.trim(),
        zipCode: isBrazil ? representative.cep.replace(/\D/g, '') : representative.cep.trim(),
        streetAddress: representative.linhaEndereco.trim(),
      })
      navigate(compliancePath(result.kycVerificationId))
    } catch (error) {
      setServerError(
        error instanceof ApiError && error.status < 500
          ? error.message
          : 'Não foi possível concluir a solicitação. Tente novamente.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (step === 0) {
    return (
      <RepresentativeStep
        initialValues={representative ?? undefined}
        onBack={() => navigate(PATHS.HOME)}
        onContinue={(data) => {
          setRepresentative(data)
          setStep(1)
        }}
      />
    )
  }

  return (
    <CompanyStep
      onCancel={() => setStep(0)}
      onContinue={handleCompanyContinue}
      saving={saving}
      serverError={serverError}
    />
  )
}

export { Register }
