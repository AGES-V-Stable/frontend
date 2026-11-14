import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '@/features/auth'
import { addMockTopUp } from '@/features/dashboard/api/balance'
import { useBalance } from '@/features/dashboard/hooks/useBalance'
import {
  canAddSimulatedBalance,
  describeSimulatedDepositError,
  isUncertainSimulatedDepositOutcome,
} from '@/features/dashboard/utils/simulatedDeposit'
import { normalizeMockTopUp, projectedMockBalance } from '@/features/dashboard/utils/mockTopUp'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { PATHS } from '@/shared/navigation/paths'
import { formatMoneyString } from '@/shared/utils/formatters'

const formatBrl = (value: string | null) =>
  (value === null ? null : formatMoneyString(value, 'BRL')) ?? 'Indisponível'

/** Dedicated mock-credit page. Only the server can authorize an actual balance change. */
export function MockTopUp() {
  const navigate = useNavigate()
  const { user } = useSession()
  const { state, retry } = useBalance()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [requiresReconciliation, setRequiresReconciliation] = useState(false)
  const inFlight = useRef(false)
  const permitted = canAddSimulatedBalance(user)
  const credit = normalizeMockTopUp(amount)
  const projected =
    credit && state.status === 'ready' ? projectedMockBalance(state.balance, credit) : null

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current || requiresReconciliation || !permitted || state.status !== 'ready') return
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
      retry()
    } catch (cause) {
      setError(describeSimulatedDepositError(cause))
      if (isUncertainSimulatedDepositOutcome(cause)) {
        // Não podemos assumir que um erro de rede significa que o crédito foi revertido.
        // Uma nova tentativa com o mesmo valor poderia duplicar o saldo.
        setRequiresReconciliation(true)
        retry()
      }
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Adicionar saldo</h1>
        <p className="text-sm text-slate-600">
          Simulação: nenhum pagamento ou transferência real será realizado.
        </p>
      </header>

      <div className="rounded-xl border border-sage-300 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Saldo disponível em BRL</h2>
        {state.status === 'loading' && <p role="status">Carregando saldo...</p>}
        {state.status === 'error' && (
          <div className="mt-3 flex flex-col gap-3" role="alert">
            <p>{state.message}</p>
            <Button variant="secondary" label="Tentar carregar novamente" onClick={retry} />
          </div>
        )}
        {state.status === 'ready' && (
          <p className="mt-2 font-mono text-3xl font-semibold text-slate-900">
            {formatBrl(state.balance)}
          </p>
        )}
      </div>

      {permitted ? (
        <form
          noValidate
          onSubmit={(event) => void submit(event)}
          className="flex flex-col gap-5 rounded-xl border border-sage-300 bg-white p-6"
        >
          <h2 className="text-lg font-semibold text-slate-900">Crédito fictício</h2>
          <Input
            label="Valor a adicionar (R$)"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value)
              setError(null)
              setSuccess(null)
            }}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            disabled={submitting || requiresReconciliation}
            error={error ?? undefined}
          />
          <div className="grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Valor informado</p>
              <p className="font-mono font-semibold">{credit ? formatBrl(credit) : '—'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Saldo após o crédito</p>
              <p className="font-mono font-semibold">{projected ? formatBrl(projected) : '—'}</p>
            </div>
          </div>
          {requiresReconciliation && (
            <p role="alert" className="text-sm text-amber-900">
              Não foi possível confirmar se o crédito já foi registrado. Confira o saldo atualizado
              e procure o suporte antes de solicitar outro crédito. Para evitar duplicidade, esta
              tela não permite uma nova tentativa agora.
            </p>
          )}
          {success && (
            <p role="status" className="text-sm text-emerald-800">
              {success}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              label="Voltar"
              disabled={submitting}
              onClick={() => navigate(PATHS.DASHBOARD)}
              className="sm:!w-auto"
            />
            <Button
              type="submit"
              label={submitting ? 'Adicionando...' : 'Confirmar crédito simulado'}
              disabled={submitting || requiresReconciliation || state.status !== 'ready'}
              className="sm:!w-auto"
            />
          </div>
        </form>
      ) : (
        <p role="alert" className="rounded-xl border border-sage-300 bg-white p-6 text-slate-700">
          Apenas o proprietário com acesso ativo pode solicitar crédito simulado.
        </p>
      )}
    </section>
  )
}
