import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useSession } from '@/features/auth'
import { addMockTopUp } from '@/features/dashboard/api/balance'
import type { BalanceState } from '@/features/dashboard/hooks/useBalance'
import {
  canAddSimulatedBalance,
  describeSimulatedDepositError,
  isUncertainSimulatedDepositOutcome,
} from '@/features/dashboard/utils/simulatedDeposit'
import { normalizeMockTopUp, projectedMockBalance } from '@/features/dashboard/utils/mockTopUp'
import { formatMoneyString } from '@/shared/utils/formatters'

export const formatBrl = (value: string | null) =>
  (value === null ? null : formatMoneyString(value, 'BRL')) ?? 'Indisponível'

/**
 * Regras do crédito simulado, usadas pela página e pelo modal de Adicionar saldo.
 * Só o servidor autoriza a mudança de saldo; a tela só atualiza depois da confirmação dele.
 */
export function useMockTopUp(balance: BalanceState, refreshBalance: () => void) {
  const { user } = useSession()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [requiresReconciliation, setRequiresReconciliation] = useState(false)
  const inFlight = useRef(false)
  const permitted = canAddSimulatedBalance(user)
  const credit = normalizeMockTopUp(amount)
  const projected =
    credit && balance.status === 'ready' ? projectedMockBalance(balance.balance, credit) : null

  function changeAmount(value: string) {
    setAmount(value)
    setError(null)
    setSuccess(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current || requiresReconciliation || !permitted || balance.status !== 'ready')
      return
    if (!credit) {
      setError('Informe um valor positivo em BRL, com até duas casas decimais.')
      return
    }
    if (projected === null) {
      setError('O saldo projetado ultrapassa a capacidade técnica permitida.')
      return
    }

    inFlight.current = true
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await addMockTopUp(credit)
      // A tela só atualiza após confirmação real do backend.
      setSuccess(
        `Crédito simulado de ${formatBrl(result.creditedAmountBrl)} confirmado. Saldo atualizado: ${formatBrl(result.availableBalanceBrl)}.`,
      )
      setAmount('')
      refreshBalance()
    } catch (cause) {
      setError(describeSimulatedDepositError(cause))
      if (isUncertainSimulatedDepositOutcome(cause)) {
        // Não podemos assumir que um erro de rede significa que o crédito foi revertido.
        // Uma nova tentativa com o mesmo valor poderia duplicar o saldo.
        setRequiresReconciliation(true)
        refreshBalance()
      }
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  return {
    permitted,
    amount,
    changeAmount,
    credit,
    projected,
    error,
    success,
    submitting,
    requiresReconciliation,
    submit,
  }
}

export type MockTopUpController = ReturnType<typeof useMockTopUp>
