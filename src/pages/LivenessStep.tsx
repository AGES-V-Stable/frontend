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

  const [status, setStatus] = useState<LivenessStatus>(() =>
    progressoCadastroId ? getLivenessStatus(progressoCadastroId) : 'idle',
  )
  const [isStarting, setIsStarting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [checkMessage, setCheckMessage] = useState<string | null>(null)
  const [manualLivenessUrl, setManualLivenessUrl] = useState<string | null>(null)

  const handleStart = useCallback(async () => {
    if (!progressoCadastroId) {
      setErrorMessage('Não foi possível confirmar o cadastro. Reinicie a verificação.')
      return
    }

    setErrorMessage(null)
    setCheckMessage(null)
    setManualLivenessUrl(null)
    setIsStarting(true)

    // Tentamos abrir a aba já aqui, de forma síncrona dentro do clique do
    // usuário — se essa chamada viesse depois do await abaixo, o navegador não
    // reconheceria mais a "user activation" do clique e bloquearia o pop-up de
    // verdade (independente de "noopener"). Não passamos "noopener" nas
    // features: com ele, o Chrome/Firefox retornam null de propósito mesmo
    // quando a aba abre com sucesso (não há referência pra devolver) — em vez
    // disso, zeramos `.opener` manualmente pelo mesmo isolamento de segurança.
    //
    // Mesmo assim, alguns navegadores/configurações ainda bloqueiam esse
    // window.open mesmo sendo síncrono (ex.: bloqueio de pop-up mais agressivo
    // no Firefox). Nesse caso não travamos o fluxo: a verificação já foi
    // iniciada no backend, então seguimos para o estado "pending" normalmente
    // e oferecemos um link manual, em vez de forçar o usuário a ficar preso na
    // tela de "Iniciar verificação facial".
    const livenessTab = window.open('', '_blank', 'noreferrer')
    if (livenessTab) livenessTab.opener = null

    try {
      const { id, livenessUrl } = await startLivenessVerification(progressoCadastroId)
      saveLivenessSession(id, 'pending', progressoCadastroId)
      setStatus('pending')

      if (livenessTab) {
        livenessTab.location.href = livenessUrl
      } else {
        setManualLivenessUrl(livenessUrl)
        setErrorMessage(
          'Não foi possível abrir a verificação facial automaticamente. Permita pop-ups para este site ou use o link abaixo; depois clique em "Verificar conclusão".',
        )
      }
    } catch {
      livenessTab?.close()
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
    const livenessId = progressoCadastroId ? getLivenessId(progressoCadastroId) : null
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
        setLivenessStatus('success')
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
    setManualLivenessUrl(null)
  }, [])

  const handleContinue = useCallback(async () => {
    const livenessId = progressoCadastroId ? getLivenessId(progressoCadastroId) : null
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
      // vão direto para a Avenia sem serem persistidos no nosso banco. A
      // finalização é idempotente no backend: pode devolver aprovado, em
      // análise ou rejeitado sem necessariamente ter reenviado nada de novo.
      const result = await submitKyc(progressoCadastroId, personalData)

      if (result.status === 'REJECTED') {
        setErrorMessage(
          result.resultMessage
            ? `Verificação de identidade rejeitada: ${result.resultMessage}`
            : 'Verificação de identidade rejeitada. Entre em contato com o suporte.',
        )
        return
      }

      // APPROVED ou UNDER_REVIEW: o cadastro segue — a análise de UNDER_REVIEW
      // continua em segundo plano do lado da Avenia/compliance. A sessão (token)
      // continua válida para o usuário acompanhar a situação cadastral; só os
      // dados temporários de identidade são descartados.
      clearRepresentativePersonalData()
      clearLivenessSession()
      if (onContinue) {
        onContinue()
      } else {
        void navigate(PATHS.HOME)
      }
    } catch (error) {
      // 422 (rejeição de negócio da Avenia, ex.: "CPF já usado em outro cadastro") traz uma
      // mensagem acionável do backend; qualquer outro status é tratado como falha genérica de
      // comunicação, sem detalhes técnicos pro usuário.
      setErrorMessage(
        error instanceof ApiError && error.status === 422
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

      {manualLivenessUrl && (
        <a
          href={manualLivenessUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-primary underline"
        >
          Abrir verificação facial manualmente
        </a>
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
