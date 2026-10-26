import type { TransactionVolumeState } from '@/features/dashboard/hooks/useTransactionVolume'
import { formatMoneyString } from '@/shared/utils/formatters'

export interface TransactionVolumeCardProps {
  state: TransactionVolumeState
  onRetry: () => void
}

export function TransactionVolumeCard({ state, onRetry }: TransactionVolumeCardProps) {
  const formatted = state.status === 'ready' ? formatMoneyString(state.volume, 'BRL') : null

  return (
    <article
      aria-labelledby="transaction-volume-card-title"
      aria-busy={state.status === 'loading'}
      className="rounded-2xl border border-sage-300 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <h2 id="transaction-volume-card-title" className="text-sm font-medium text-slate-500">
          Volume Transacionado
        </h2>
        {state.status === 'loading' && (
          <p role="status" className="text-sm text-slate-500">
            Carregando volume...
          </p>
        )}
        {state.status === 'ready' && (
          <p className="text-[26px] leading-8 font-bold break-words text-slate-900">
            {formatted ?? 'Indisponível'}
          </p>
        )}
        {state.status === 'error' && (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-sm text-slate-700">
              {state.message}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="cursor-pointer text-sm font-medium text-emerald-600 underline hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-emerald-700"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
