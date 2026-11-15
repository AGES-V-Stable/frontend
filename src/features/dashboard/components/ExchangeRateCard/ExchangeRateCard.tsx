import { useState } from 'react'

import { MetricCard } from '@/features/dashboard/components/MetricCard'
import type { MetricCardState } from '@/features/dashboard/components/MetricCard'
import type { ExchangeRatesState } from '@/features/dashboard/hooks/useExchangeRates'
import type { ExchangeRate } from '@/features/dashboard/types/exchangeRates'
import { Select } from '@/shared/components/Select'
import { formatLocalDateTime, formatRateString } from '@/shared/utils/formatters'

export interface ExchangeRateCardProps {
  state: ExchangeRatesState
  onRetry: () => void
}

const pairKey = (rate: ExchangeRate) => `${rate.baseCurrency}-${rate.quoteCurrency}`
const UNAVAILABLE = 'Cotação indisponível'

function readyValue(rate: ExchangeRate | undefined): string {
  if (!rate) return 'Nenhuma cotação disponível'
  const value = rate.rate === null ? null : formatRateString(rate.rate, rate.baseCurrency)
  return value === null ? UNAVAILABLE : `1 ${rate.quoteCurrency} = ${value}`
}

function Footnote({ rate }: { rate: ExchangeRate | undefined }) {
  if (!rate || rate.status === 'UNAVAILABLE' || readyValue(rate) === UNAVAILABLE) {
    return <p>Taxa de referência de mercado, sem tarifas.</p>
  }
  return (
    <div className="flex flex-col items-start gap-1">
      {rate.status === 'STALE' && (
        <span className="rounded-2xl bg-amber-50 px-2 py-0.5 font-bold text-amber-700">
          Cotação desatualizada
        </span>
      )}
      <p>
        Atualizado em <time dateTime={rate.fetchedAt}>{formatLocalDateTime(rate.fetchedAt)}</time>
      </p>
      <p>Taxa de referência de mercado, sem tarifas.</p>
    </div>
  )
}

/** Câmbio atual (cicd#55) na linha de métricas, com a escolha do par numa lista suspensa. */
export function ExchangeRateCard({ state, onRetry }: ExchangeRateCardProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const rates = state.status === 'ready' ? state.rates : []
  const selected = rates.find((rate) => pairKey(rate) === selectedKey) ?? rates[0]

  const cardState: MetricCardState =
    state.status === 'loading'
      ? { status: 'loading', label: 'Carregando cotações...' }
      : state.status === 'error'
        ? { status: 'error', message: state.message, onRetry }
        : { status: 'ready', value: readyValue(selected) }

  return (
    <MetricCard
      title="Câmbio Atual"
      accent="neutral"
      state={cardState}
      action={
        selected && (
          <div className="w-36 shrink-0">
            <Select
              aria-label="Par de moedas"
              value={pairKey(selected)}
              onChange={(event) => setSelectedKey(event.target.value)}
              options={rates.map((rate) => ({
                value: pairKey(rate),
                label: `${rate.baseCurrency} → ${rate.quoteCurrency}`,
              }))}
              className="!py-1.5 !text-[14px]"
            />
          </div>
        )
      }
      footnote={state.status === 'ready' ? <Footnote rate={selected} /> : undefined}
    />
  )
}
