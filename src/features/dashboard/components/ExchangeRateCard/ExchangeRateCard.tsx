import { useId } from 'react'

import type { ExchangeRatesState } from '@/features/dashboard/hooks/useExchangeRates'
import type { ExchangeRate } from '@/features/dashboard/types/exchangeRates'
import { StatusBadge } from '@/shared/components/Table'
import { formatLocalDateTime, formatRateString } from '@/shared/utils/formatters'

export interface ExchangeRateCardProps {
  state: ExchangeRatesState
  onRetry: () => void
}

function RateItem({ rate }: { rate: ExchangeRate }) {
  const pair = `${rate.baseCurrency} → ${rate.quoteCurrency}`
  const value = rate.rate === null ? null : formatRateString(rate.rate, rate.baseCurrency)
  return (
    <li className="flex flex-col gap-1 rounded-lg border border-sage-300 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-700">
          <span aria-hidden="true">{pair}</span>
          <span className="sr-only">
            {rate.baseCurrency} para {rate.quoteCurrency}
          </span>
        </span>
        {rate.status === 'STALE' && <StatusBadge label="Cotação desatualizada" variant="warning" />}
      </div>
      {rate.status === 'UNAVAILABLE' || value === null ? (
        <p className="text-base font-medium text-slate-500">Cotação indisponível</p>
      ) : (
        <>
          <p
            className={`text-xl font-bold break-words ${
              rate.status === 'STALE' ? 'text-slate-500' : 'text-slate-900'
            }`}
          >
            1 {rate.quoteCurrency} = {value}
          </p>
          <p className="text-xs text-slate-500">
            Atualizado em{' '}
            <time dateTime={rate.fetchedAt}>{formatLocalDateTime(rate.fetchedAt)}</time>
          </p>
        </>
      )}
    </li>
  )
}

/** Câmbio atual (cicd#55): uma linha por par, com a situação de cada cotação. */
export function ExchangeRateCard({ state, onRetry }: ExchangeRateCardProps) {
  const titleId = useId()
  return (
    <section
      aria-labelledby={titleId}
      aria-busy={state.status === 'loading'}
      className="flex flex-col gap-3 rounded-xl border border-sage-300 bg-white p-5"
    >
      <header className="flex flex-col gap-1">
        <h2 id={titleId} className="text-xl font-bold text-slate-900">
          Câmbio Atual
        </h2>
        <p className="text-sm text-slate-500">Taxas de referência de mercado, sem tarifas.</p>
      </header>
      {state.status === 'loading' && (
        <p role="status" className="text-sm text-slate-500">
          Carregando cotações...
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
            className="cursor-pointer text-sm font-medium text-emerald-700 underline hover:decoration-2 focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {state.status === 'ready' &&
        (state.rates.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma cotação disponível no momento.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.rates.map((rate) => (
              <RateItem key={`${rate.baseCurrency}-${rate.quoteCurrency}`} rate={rate} />
            ))}
          </ul>
        ))}
    </section>
  )
}
