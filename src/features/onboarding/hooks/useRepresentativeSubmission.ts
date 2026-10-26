import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { AccessData, CompanyData, RepresentativeData } from '../types/registration'
import { ApiError, saveRepresentativePersonalData, submitOnboarding } from '../api/onboarding'
import { twoFactorSetupPath } from '@/shared/navigation/paths'

export function useRepresentativeSubmission(access?: AccessData, company?: CompanyData) {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')

  async function handleContinue(representative: RepresentativeData) {
    if (!access || !company) return
    setSaving(true)
    setServerError('')
    try {
      const isBrazil = company.pais.trim().toLowerCase() === 'brasil'
      const result = await submitOnboarding(
        {
          fullName: access.nomeCompleto,
          email: access.email,
          password: access.senha,
          confirmPassword: access.confirmarSenha,
          cargoFuncao: representative.cargo_funcao,
          participacaoSocietaria: representative.participacao_societaria,
          cpf: representative.cpf,
          dateOfBirth: representative.date_of_birth,
          phone: representative.phone,
          pais: representative.pais,
          cep: representative.cep,
          cidade: representative.cidade,
          estado: representative.estado,
          linhaEndereco: representative.linha_endereco,
        },
        company,
      )
      saveRepresentativePersonalData({
        fullName: access.nomeCompleto.trim(),
        email: access.email.trim(),
        phone: representative.phone.replace(/\D/g, ''),
        dateOfBirth: representative.date_of_birth,
        taxIdNumber: representative.cpf.replace(/\D/g, ''),
        country: representative.pais.trim(),
        state: representative.estado.trim(),
        city: representative.cidade.trim(),
        zipCode: isBrazil ? representative.cep.replace(/\D/g, '') : representative.cep.trim(),
        streetAddress: representative.linha_endereco.trim(),
      })
      void navigate(twoFactorSetupPath(result.kycVerificationId))
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

  return { saving, serverError, handleContinue }
}
