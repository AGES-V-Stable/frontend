import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/Button'
import { PATHS } from '@/routes/paths'
import {
  checkLivenessStatus,
  clearLivenessSession,
  getLivenessId,
  getLivenessStatus,
  saveLivenessSession,
  setLivenessStatus,
  startLivenessVerification,
  submitLivenessResult,
} from '@/services/liveness'
import {
  ApiError,
  clearAccessToken,
  clearRepresentativePersonalData,
  getRepresentativePersonalData,
  submitKyc,
} from '@/services/onboarding'
import type { LivenessStatus } from '@/types/liveness'

export interface LivenessStepProps {
  /** TODO: obter do estado do wizard assim que o fluxo de cadastro estiver implementado. */
  progressoCadastroId?: string
  onContinue?: () => void
}

function LivenessStep({ progressoCadastroId, onContinue }: LivenessStepProps) {
  const navigate = useNavigate()

  const [status, setStatus] = useState<LivenessStatus>(() => getLivenessStatus(progressoCadastroId))
  const [isStarting, setIsStarting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [checkMessage, setCheckMessage] = useState<string | null>(null)

  const handleStart = useCallback(async () => {
    if (!progressoCadastroId) {
      setErrorMessage('Não foi possível confirmar o cadastro. Reinicie a verificação.')
      return
    }

    setErrorMessage(null)
    setCheckMessage(null)

    // A aba precisa ser criada durante o clique. Se window.open for chamado só
    // depois do await, o navegador já não o considera uma ação direta do usuário
    // e pode bloquear o pop-up. Além disso, usar "noopener" no terceiro argumento
    // faz alguns navegadores retornarem null mesmo quando a aba foi aberta, o que
    // gerava o falso erro de pop-up bloqueado visto na interface.
    const livenessTab = window.open('about:blank', '_blank')
    if (!livenessTab) {
      setErrorMessage(
        'Não foi possível abrir a verificação facial em uma nova aba. Permita pop-ups para este site e tente novamente.',
      )
      return
    }
    livenessTab.opener = null

    setIsStarting(true)
    try {
      const { id, livenessUrl } = await startLivenessVerification(progressoCadastroId)
      saveLivenessSession(progressoCadastroId, id, 'pending')
      setStatus('pending')

      // Navega a aba já autorizada pelo clique, preservando o wizard nesta aba.
      livenessTab.location.replace(livenessUrl)
    } catch {
      livenessTab.close()
      setErrorMessage('Não foi possível iniciar a verificação facial. Tente novamente.')
    } finally {
      setIsStarting(false)
    }
  }, [progressoCadastroId])

  // A Avenia não avisa a gente automaticamente quando o liveness termina (sem
  // redirect de volta, sem webhook que chegue no front) — por isso a
  // confirmação é manual: o usuário volta pra esta aba e clica em "Verificar
  // conclusão", que consulta o backend (proxy fino pra Avenia).
  const handleCheck = useCallback(async () => {
    const livenessId = getLivenessId(progressoCadastroId)
    if (!livenessId || !progressoCadastroId) {
      setErrorMessage('Não foi possível confirmar o cadastro. Reinicie a verificação.')
      return
    }

    setErrorMessage(null)
    setCheckMessage(null)
    setIsChecking(true)
    try {
      const { ready } = await checkLivenessStatus(progressoCadastroId, livenessId)
      if (ready) {
        setLivenessStatus(progressoCadastroId, 'success')
        setStatus('success')
      } else {
        setCheckMessage(
          'Verificação ainda não concluída. Finalize na aba aberta e tente novamente.',
        )
      }
    } catch {
      setErrorMessage('Não foi possível verificar a conclusão. Tente novamente.')
    } finally {
      setIsChecking(false)
    }
  }, [progressoCadastroId])

  const handleRetry = useCallback(() => {
    clearLivenessSession()
    setStatus('idle')
    setErrorMessage(null)
    setCheckMessage(null)
  }, [])

  const handleContinue = useCallback(async () => {
    const livenessId = getLivenessId(progressoCadastroId)
    if (!livenessId || !progressoCadastroId) {
      setErrorMessage('Não foi possível confirmar o cadastro. Reinicie a verificação.')
      return
    }

    const personalData = getRepresentativePersonalData()
    if (!personalData) {
      setErrorMessage('Não foi possível recuperar os dados do representante. Reinicie o cadastro.')
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      await submitLivenessResult(progressoCadastroId, livenessId)
      // O documento e o liveness já estão salvos na verificação de KYC no
      // backend; o KYC finaliza combinando eles com esses dados pessoais, que
      // vão direto para a Avenia sem serem persistidos no nosso banco.
      await submitKyc(progressoCadastroId, personalData)
      clearLivenessSession()
      clearRepresentativePersonalData()
      clearAccessToken()
      if (onContinue) {
        onContinue()
      } else {
        navigate(PATHS.HOME)
      }
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível confirmar a verificação. Tente novamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [progressoCadastroId, onContinue, navigate])

  const isVerified = status === 'success'
  const isPending = status === 'pending'

  return (
    <div className="p-8 flex flex-col items-center gap-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Verificação facial</h1>
      <p className="text-sm text-gray-600 text-center">
        Para concluir a etapa de compliance, precisamos confirmar sua identidade com uma verificação
        facial rápida.
      </p>

      {isPending && !isVerified && (
        <p className="text-sm text-gray-600 text-center">
          Complete a verificação na aba que abrimos e depois clique em "Verificar conclusão".
        </p>
      )}

      {checkMessage && (
        <p role="status" className="text-sm text-amber-600">
          {checkMessage}
        </p>
      )}

      {errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      {isVerified ? (
        <p className="text-sm text-green-700">Verificação concluída com sucesso.</p>
      ) : isPending ? (
        <div className="flex flex-col gap-2 w-full">
          <Button
            label={isChecking ? 'Verificando...' : 'Verificar conclusão'}
            variant="secondary"
            onClick={handleCheck}
            disabled={isChecking}
          />
          <Button
            label="Recomeçar verificação"
            variant="secondary"
            onClick={handleRetry}
            disabled={isChecking}
          />
        </div>
      ) : (
        <Button
          label={isStarting ? 'Redirecionando...' : 'Iniciar verificação facial'}
          variant="secondary"
          onClick={handleStart}
          disabled={isStarting}
        />
      )}

      <Button
        label={isSubmitting ? 'Enviando...' : 'Continuar'}
        variant="primary"
        onClick={handleContinue}
        disabled={!isVerified || isSubmitting}
      />
    </div>
  )
}

export default LivenessStep
