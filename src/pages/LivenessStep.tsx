import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { Button } from '@/components/Button'
import { PATHS } from '@/routes/paths'
import {
  clearLivenessSession,
  getLivenessId,
  getLivenessStatus,
  saveLivenessSession,
  setLivenessStatus,
  startLivenessVerification,
  submitLivenessResult,
} from '@/services/liveness'
import type { LivenessStatus } from '@/types/liveness'

const SUCCESS_QUERY_VALUES = ['success', 'approved', 'completed']
const FAILURE_QUERY_VALUES = ['failure', 'failed', 'rejected', 'error']

export interface LivenessStepProps {
  /** TODO: obter do estado do wizard assim que o fluxo de cadastro estiver implementado. */
  progressoCadastroId?: string
  onContinue?: () => void
}

function LivenessStep({ progressoCadastroId, onContinue }: LivenessStepProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // TODO(contrato-avenia): o mecanismo real de retorno do redirect da Avenia (nomes de
  // query params, necessidade de informar uma returnUrl na chamada inicial) ainda não
  // foi validado no sandbox. Ajustar esta leitura assim que o contrato for confirmado.
  const [status, setStatus] = useState<LivenessStatus>(() => {
    const returnStatus = searchParams.get('status') ?? searchParams.get('livenessStatus')
    if (returnStatus) {
      const normalized = returnStatus.toLowerCase()
      if (SUCCESS_QUERY_VALUES.includes(normalized)) {
        setLivenessStatus('success')
        return 'success'
      }
      if (FAILURE_QUERY_VALUES.includes(normalized)) {
        setLivenessStatus('failure')
        return 'failure'
      }
    }
    return getLivenessStatus()
  })
  const [isStarting, setIsStarting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!searchParams.has('status') && !searchParams.has('livenessStatus')) return

    setSearchParams(
      (params) => {
        params.delete('status')
        params.delete('livenessStatus')
        return params
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  const handleStart = useCallback(async () => {
    if (!progressoCadastroId) {
      setErrorMessage('Não foi possível confirmar o cadastro. Reinicie a verificação.')
      return
    }

    setErrorMessage(null)
    setIsStarting(true)
    try {
      const { id, livenessUrl } = await startLivenessVerification(progressoCadastroId)
      saveLivenessSession(id, 'pending')
      setStatus('pending')
      window.location.href = livenessUrl
    } catch {
      setErrorMessage('Não foi possível iniciar a verificação facial. Tente novamente.')
      setIsStarting(false)
    }
  }, [progressoCadastroId])

  const handleRetry = useCallback(() => {
    clearLivenessSession()
    setStatus('idle')
    setErrorMessage(null)
  }, [])

  const handleContinue = useCallback(async () => {
    const livenessId = getLivenessId()
    if (!livenessId || !progressoCadastroId) {
      setErrorMessage('Não foi possível confirmar o cadastro. Reinicie a verificação.')
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      await submitLivenessResult(progressoCadastroId, livenessId)
      if (onContinue) {
        onContinue()
      } else {
        navigate(PATHS.HOME)
      }
    } catch {
      setErrorMessage('Não foi possível confirmar a verificação. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }, [progressoCadastroId, onContinue, navigate])

  const isVerified = status === 'success'
  const isFailure = status === 'failure'

  return (
    <div className="p-8 flex flex-col items-center gap-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Verificação facial</h1>
      <p className="text-sm text-gray-600 text-center">
        Para concluir a etapa de compliance, precisamos confirmar sua identidade com uma verificação
        facial rápida.
      </p>

      {isFailure && (
        <p role="alert" className="text-sm text-red-600">
          Não foi possível concluir a verificação facial. Tente novamente.
        </p>
      )}

      {errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      {isVerified ? (
        <p className="text-sm text-green-700">Verificação concluída com sucesso.</p>
      ) : (
        <Button
          label={
            isStarting
              ? 'Redirecionando...'
              : isFailure
                ? 'Tentar novamente'
                : 'Iniciar verificação facial'
          }
          variant="secondary"
          onClick={isFailure ? handleRetry : handleStart}
          disabled={isStarting || status === 'pending'}
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
