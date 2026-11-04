import type { ReactNode } from 'react'

import type { TransactionVolumeState } from '@/features/dashboard/hooks/useTransactionVolume'
import { MetricCard } from '@/features/dashboard/components/MetricCard'
import type { MetricAccent } from '@/features/dashboard/components/MetricCard'
import { formatMoneyString } from '@/shared/utils/formatters'

export interface TransactionVolumeCardProps {
  state: TransactionVolumeState
  onRetry: () => void
  accent?: MetricAccent
  footnote?: ReactNode
}

export function TransactionVolumeCard({
  state,
  onRetry,
  accent = 'neutral',
  footnote,
}: TransactionVolumeCardProps) {
  return (
    <MetricCard
      title="Volume Transacionado"
      accent={accent}
      state={
        state.status === 'loading'
          ? { status: 'loading', label: 'Carregando volume...' }
          : state.status === 'error'
            ? { status: 'error', message: state.message, onRetry }
            : { status: 'ready', value: formatMoneyString(state.volume, 'BRL') ?? 'Indisponível' }
      }
      footnote={footnote}
    />
  )
}
