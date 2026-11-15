import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { addSimulatedBalance } from '@/features/dashboard/api/balance'
import {
  describeSimulatedDepositError,
  normalizeDepositAmount,
} from '@/features/dashboard/utils/simulatedDeposit'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Modal } from '@/shared/components/Modal'

export interface SimulatedDepositDialogProps {
  /** Chamado depois que o backend confirmou o crédito. */
  onDeposited: () => void
  onClose: () => void
}

/**
 * Crédito simulado em BRL (cicd#24). Um envio por vez; em caso de falha o valor digitado é mantido e o
 * motivo vem da `code` do backend (identidade não verificada, limite, ambiente sem crédito simulado).
 */
export function SimulatedDepositDialog({ onDeposited, onClose }: SimulatedDepositDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const inFlight = useRef(false)
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    const normalized = normalizeDepositAmount(amount)
    if (!normalized) {
      setError('Informe um valor positivo com até duas casas decimais.')
      return
    }
    inFlight.current = true
    setSubmitting(true)
    setError(null)
    try {
      await addSimulatedBalance(normalized)
      onDeposited()
    } catch (cause) {
      setError(describeSimulatedDepositError(cause))
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <Modal labelledBy={titleId} describedBy={descriptionId} busy={submitting} onClose={onClose}>
      <header className="flex flex-col gap-1">
        <h2 id={titleId} className="text-xl font-semibold text-slate-900">
          Adicionar saldo simulado
        </h2>
        <p id={descriptionId} className="text-sm text-slate-500">
          Crédito fictício para testes: não movimenta dinheiro real.
        </p>
      </header>
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-5"
        noValidate
      >
        <Input
          label="Valor do crédito simulado (R$)"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value)
            setError(null)
          }}
          disabled={submitting}
          error={error ?? undefined}
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            label="Cancelar"
            disabled={submitting}
            onClick={onClose}
            className="sm:!w-auto"
          />
          <Button
            type="submit"
            label={submitting ? 'Adicionando...' : 'Adicionar saldo simulado'}
            disabled={submitting}
            className="sm:!w-auto"
          />
        </div>
      </form>
    </Modal>
  )
}
