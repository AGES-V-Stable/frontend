import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { useSession } from '@/features/auth'
import { compliancePath } from '@/shared/navigation/paths'
import type { CompanyData, RepresentativeData } from '../types/registration'
import { ApiError, registerCompany, saveRepresentativePersonalData } from '../api/onboarding'
import { representativePersonalData } from '../model/representativePersonalData'

const conflictMessage = (error: ApiError) =>
  /cnpj/i.test(error.message)
    ? 'Este CNPJ já está cadastrado. Para acessar uma empresa existente, peça um convite ao gestor dela.'
    : 'Sua conta já está vinculada a uma empresa.'

/**
 * Cadastro da empresa por quem já tem conta: o usuário autenticado vira dono da empresa e
 * segue para a documentação e o liveness do representante, como no cadastro em uma etapa.
 */
export function useCompanyRegistration(company: CompanyData | null) {
  const navigate = useNavigate()
  const { user, retry } = useSession()
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')
  const registered = useRef(false)

  // A sessão passa a ter empresa e perfil de dono e é recarregada do backend, mas só depois de
  // sair desta página: recarregar antes faria o guarda da rota desmontá-la e a navegação para a
  // documentação competir com o redirecionamento de quem já tem empresa.
  useEffect(
    () => () => {
      if (registered.current) retry()
    },
    [retry],
  )

  async function handleContinue(representative: RepresentativeData) {
    if (!company || !user) return
    setSaving(true)
    setServerError('')
    try {
      const result = await registerCompany(company)
      registered.current = true
      saveRepresentativePersonalData(
        representativePersonalData(
          { fullName: user.name, email: user.email },
          representative,
          company,
        ),
      )
      void navigate(compliancePath(result.kycVerificationId))
    } catch (error) {
      setServerError(
        error instanceof ApiError && error.status === 409
          ? conflictMessage(error)
          : error instanceof ApiError && error.status < 500
            ? error.message
            : 'Não foi possível concluir a solicitação. Tente novamente.',
      )
    } finally {
      setSaving(false)
    }
  }

  return { saving, serverError, handleContinue }
}
