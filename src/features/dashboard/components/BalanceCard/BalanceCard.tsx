import type { ReactNode } from 'react'
import type { BalanceState } from '@/features/dashboard/hooks/useBalance'
import { MetricCard } from '@/features/dashboard/components/MetricCard'
import { formatMoneyString } from '@/shared/utils/formatters'

export interface BalanceCardProps {
  state: BalanceState
  onRetry: () => void
  /** Ação ao lado do título, como o atalho para adicionar saldo. */
  action?: ReactNode
}

export function BalanceCard({ state, onRetry, action }: BalanceCardProps) {
  return (
    <MetricCard
      title="Saldo Disponível"
      action={action}
      accent="neutral"
      state={
        state.status === 'loading'
          ? { status: 'loading', label: 'Carregando saldo...' }
          : state.status === 'error'
            ? { status: 'error', message: state.message, onRetry }
            : { status: 'ready', value: formatMoneyString(state.balance, 'BRL') ?? 'Indisponível' }
      }
      footnote="Saldo atual em BRL"
    />
  )
}
