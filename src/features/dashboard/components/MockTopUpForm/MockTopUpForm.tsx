import type { ReactNode } from 'react'
import { formatBrl } from '@/features/dashboard/hooks/useMockTopUp'
import type { MockTopUpController } from '@/features/dashboard/hooks/useMockTopUp'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'

export interface MockTopUpFormProps {
  topUp: MockTopUpController
  balanceReady: boolean
  /** Título do formulário; o modal não usa, porque o título dele já nomeia a ação. */
  heading?: ReactNode
  secondaryLabel: string
  onSecondary: () => void
  className?: string
}

/** Campos, prévia e ações do crédito simulado, iguais na página e no modal. */
export function MockTopUpForm({
  topUp,
  balanceReady,
  heading,
  secondaryLabel,
  onSecondary,
  className = '',
}: MockTopUpFormProps) {
  const { credit, projected, error, success, submitting, requiresReconciliation } = topUp
  return (
    <form
      noValidate
      onSubmit={(event) => void topUp.submit(event)}
      className={`flex flex-col gap-5 ${className}`}
    >
      {heading}
      <Input
        label="Valor a adicionar (R$)"
        value={topUp.amount}
        onChange={(event) => topUp.changeAmount(event.target.value)}
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
          Não foi possível confirmar se o crédito já foi registrado. Confira o saldo atualizado e
          procure o suporte antes de solicitar outro crédito. Para evitar duplicidade, esta tela não
          permite uma nova tentativa agora.
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
          label={secondaryLabel}
          disabled={submitting}
          onClick={onSecondary}
          className="sm:!w-auto"
        />
        <Button
          type="submit"
          label={submitting ? 'Adicionando...' : 'Confirmar crédito simulado'}
          disabled={submitting || requiresReconciliation || !balanceReady}
          className="sm:!w-auto"
        />
      </div>
    </form>
  )
}
