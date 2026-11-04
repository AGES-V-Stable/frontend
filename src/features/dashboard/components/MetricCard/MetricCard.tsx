import { useId } from 'react'
import type { ReactNode } from 'react'

export type MetricAccent = 'emerald' | 'sky' | 'neutral'

export type MetricCardState =
  | { status: 'loading'; label: string }
  | { status: 'ready'; value: string }
  | { status: 'error'; message: string; onRetry: () => void }

export interface MetricCardProps {
  title: string
  accent: MetricAccent
  state: MetricCardState
  /** Contexto exibido abaixo do valor (período, observações). */
  footnote?: ReactNode
}

const ACCENT_BAR: Record<MetricAccent, string> = {
  emerald: 'bg-primary',
  sky: 'bg-sky-600',
  neutral: 'bg-slate-300',
}
const VALUE_COLOR: Record<MetricAccent, string> = {
  emerald: 'text-primary',
  sky: 'text-sky-600',
  neutral: 'text-slate-900',
}

/** Card da linha de métricas do dashboard, com a faixa de destaque do Figma. */
export function MetricCard({ title, accent, state, footnote }: MetricCardProps) {
  const titleId = useId()
  return (
    <section
      aria-labelledby={titleId}
      aria-busy={state.status === 'loading'}
      className="relative flex flex-col gap-1 overflow-hidden rounded-xl border border-sage-300 bg-white px-4 pt-5 pb-4"
    >
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${ACCENT_BAR[accent]}`} />
      <h2 id={titleId} className="text-sm font-medium text-slate-500">
        {title}
      </h2>
      {state.status === 'loading' && (
        <p role="status" className="text-sm text-slate-500">
          {state.label}
        </p>
      )}
      {state.status === 'ready' && (
        <p className={`text-2xl font-bold break-words ${VALUE_COLOR[accent]}`}>{state.value}</p>
      )}
      {state.status === 'error' && (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-slate-700">
            {state.message}
          </p>
          <button
            type="button"
            onClick={state.onRetry}
            className="cursor-pointer text-sm font-medium text-emerald-700 underline hover:decoration-2 focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {footnote && <div className="text-xs text-slate-500">{footnote}</div>}
    </section>
  )
}
