import { useCallback, useEffect, useState } from 'react'

import { getTransactionVolume } from '@/features/dashboard/api/transactionVolume'
import { ApiError } from '@/shared/http/httpClient'

export type TransactionVolumeState =
  { status: 'loading' } | { status: 'ready'; volume: string } | { status: 'error'; message: string }

const NO_COMPANY_MESSAGE =
  'Seu usuário não possui acesso a uma empresa para consultar o volume transacionado.'
const GENERIC_MESSAGE = 'Não foi possível carregar o volume transacionado. Tente novamente.'

/** `startDate` ("AAAA-MM-DD") é opcional; sem ela o volume cobre todo o histórico. */
export function useTransactionVolume(startDate?: string) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; state: TransactionVolumeState } | null>(null)
  const key = `${attempt}|${startDate ?? ''}`

  useEffect(() => {
    const controller = new AbortController()
    getTransactionVolume(startDate, controller.signal)
      .then((volume) => setResult({ key, state: { status: 'ready', volume } }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const message =
          error instanceof ApiError && error.status === 403 ? NO_COMPANY_MESSAGE : GENERIC_MESSAGE
        setResult({ key, state: { status: 'error', message } })
      })
    return () => controller.abort()
  }, [key, startDate])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const state: TransactionVolumeState = result?.key === key ? result.state : { status: 'loading' }
  return { state, retry }
}
