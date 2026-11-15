import { useCallback, useEffect, useState } from 'react'

import { getExchangeRates } from '@/features/dashboard/api/exchangeRates'
import type { ExchangeRate } from '@/features/dashboard/types/exchangeRates'

export type ExchangeRatesState =
  | { status: 'loading' }
  | { status: 'ready'; rates: ExchangeRate[] }
  | { status: 'error'; message: string }

const GENERIC_MESSAGE = 'Não foi possível carregar as cotações. Tente novamente.'

/** Busca as cotações uma vez ao montar; sem polling, nova busca só ao tentar novamente. */
export function useExchangeRates() {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ attempt: number; state: ExchangeRatesState } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getExchangeRates(controller.signal)
      .then((rates) => setResult({ attempt, state: { status: 'ready', rates } }))
      .catch(() => {
        if (controller.signal.aborted) return
        setResult({ attempt, state: { status: 'error', message: GENERIC_MESSAGE } })
      })
    return () => controller.abort()
  }, [attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const state: ExchangeRatesState =
    result?.attempt === attempt ? result.state : { status: 'loading' }
  return { state, retry }
}
