import { useRef, useState } from 'react'
import { TwoFactorAuthContainer } from '@/shared/components/TwoFactorAuth'
import { Button } from '@/shared/components/Button'
import { HttpError } from '@/shared/http/httpClient'
import type { QuoteOffer } from '@/types/quote'
import {
  confirmOffer,
  confirmRequote,
  getTransferExecution,
} from '@/features/transfers/api/orchestratedTransfers'
import type { TransferExecution } from '@/features/transfers/api/orchestratedTransfers'

/** Only explicit client rejections guarantee that no financial operation was accepted. */
function isDefinitiveRejection(error: unknown): boolean {
  return error instanceof HttpError && [400, 401, 403, 404, 409, 422, 423].includes(error.status)
}

function safeError(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 401) return 'Código TOTP incorreto, expirado ou já utilizado.'
    if (error.status === 423) return 'Autenticação bloqueada temporariamente. Tente mais tarde.'
    if (error.status === 403) return 'Você não tem permissão para confirmar esta operação.'
    if (error.status === 409 || error.status === 422)
      return 'A cotação mudou, expirou ou não pode mais ser confirmada. Consulte o estado da transferência.'
  }
  return 'Não foi possível confirmar o resultado da operação. Não envie outra confirmação; consulte o histórico de transferências ou a equipe de suporte.'
}

export interface OrchestratedOfferConfirmationProps {
  offer: QuoteOffer
  disabled?: boolean
}

/**
 * Sensitive financial confirmation: never silently re-submit after an ambiguous failure.
 * The parent controls when this pre-merge component is exposed to users.
 */
export function OrchestratedOfferConfirmation({
  offer,
  disabled = false,
}: OrchestratedOfferConfirmationProps) {
  const [code, setCode] = useState('')
  const [opened, setOpened] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requiresReconciliation, setRequiresReconciliation] = useState(false)
  const [execution, setExecution] = useState<TransferExecution | null>(null)
  const sending = useRef(false)
  const [initialTime] = useState(() => Date.now())
  const offerExpired =
    !offer.expiresAt ||
    !Number.isFinite(Date.parse(offer.expiresAt)) ||
    Date.parse(offer.expiresAt) <= initialTime

  async function handleConfirm(totpCode: string) {
    if (sending.current || disabled || requiresReconciliation) return
    const isRequote = execution?.status === 'REQUOTE_REQUIRED'
    if (!isRequote && execution) return
    if (!isRequote && (offerExpired || Date.parse(offer.expiresAt ?? '') <= Date.now())) {
      setError('A oferta expirou. Solicite uma nova cotação.')
      return
    }
    if (!/^\d{6}$/.test(totpCode)) {
      setError('Informe o código TOTP de 6 dígitos.')
      return
    }
    if (
      isRequote &&
      (!execution?.requote || Date.parse(execution.requote.expiresAt) <= Date.now())
    ) {
      setError('A nova cotação expirou. Atualize o estado da transferência.')
      return
    }

    sending.current = true
    setBusy(true)
    setError(null)
    setCode('')
    try {
      const result =
        isRequote && execution?.requote
          ? await confirmRequote(
              execution.executionId,
              {
                sourceAmount: execution.requote.source.amount,
                targetAmount: execution.requote.target.amount,
              },
              totpCode,
            )
          : await confirmOffer(
              offer.offerId,
              { sourceAmount: offer.sourceAmount, targetAmount: offer.targetAmount },
              totpCode,
            )
      setExecution(result)
      setRequiresReconciliation(false)
      setOpened(false)
    } catch (cause) {
      setError(safeError(cause))
      if (!isDefinitiveRejection(cause)) {
        // Em falha ambígua (rede, 5xx ou resposta inválida), pode existir ticket remoto.
        // Impede uma segunda submissão manual até que haja conciliação do resultado.
        setRequiresReconciliation(true)
        setOpened(false)
      }
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  async function refreshStatus() {
    if (!execution || sending.current) return
    sending.current = true
    setBusy(true)
    setError(null)
    try {
      setExecution(await getTransferExecution(execution.executionId))
      setRequiresReconciliation(false)
    } catch {
      setError('Não foi possível consultar o estado. A confirmação não será repetida.')
    } finally {
      setBusy(false)
      sending.current = false
    }
  }

  if (!execution && offerExpired) {
    return <p role="alert">Esta oferta expirou. Solicite uma nova cotação antes de confirmar.</p>
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-sage-300 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Confirmar oferta</h2>
      {execution && (
        <div className="flex flex-col gap-3">
          <p role="status">Estado da transferência: {execution.status}</p>
          {execution.status === 'AWAITING_FUNDS' && execution.fundingInstructions && (
            <p>Instruções de pagamento: {execution.fundingInstructions}</p>
          )}
          <Button
            type="button"
            variant="secondary"
            label="Atualizar estado"
            disabled={busy}
            onClick={() => void refreshStatus()}
          />
          {execution.status === 'REQUOTE_REQUIRED' && execution.requote && (
            <div>
              <p>
                O preço mudou: novo valor de origem {execution.requote.source.amount}{' '}
                {execution.requote.source.currency}, destino {execution.requote.target.amount}{' '}
                {execution.requote.target.currency}.
              </p>
              <p>É necessária nova autorização TOTP para aceitar esse preço.</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {requiresReconciliation && (
        <p role="status" className="text-sm text-amber-900">
          Nova autorização bloqueada até que a operação anterior seja verificada.
        </p>
      )}
      {!opened &&
        (!execution || (execution.status === 'REQUOTE_REQUIRED' && execution.requote)) && (
          <Button
            type="button"
            label={execution ? 'Aceitar nova cotação' : 'Confirmar oferta'}
            disabled={disabled || busy || requiresReconciliation}
            onClick={() => setOpened(true)}
          />
        )}
      {opened && (
        <TwoFactorAuthContainer
          title="Autorizar transferência"
          description="Insira um código novo de 6 dígitos. A confirmação pode movimentar valores reais em um ambiente habilitado."
          value={code}
          onChange={(next) => {
            setCode(next)
            setError(null)
          }}
          onVerify={(next) => void handleConfirm(next)}
          allowRecovery={false}
          onBack={() => {
            if (!busy) setOpened(false)
          }}
          loading={busy}
          disabled={disabled || requiresReconciliation}
          submitLabel="Autorizar operação"
        />
      )}
    </section>
  )
}
