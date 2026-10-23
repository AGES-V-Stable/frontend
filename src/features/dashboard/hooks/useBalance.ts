import { useCallback, useEffect, useState } from 'react'

import { getBalance } from '@/features/dashboard/api/balance'
import { ApiError } from '@/shared/http/httpClient'

export type BalanceState =
  | { status: 'loading' }
  | { status: 'ready'; balance: string }
  | { status: 'error'; message: string }

const NO_COMPANY_MESSAGE = 'Seu usuário não possui acesso a uma empresa para consultar o saldo.'
const GENERIC_MESSAGE = 'Não foi possível carregar o saldo. Tente novamente.'

export function useBalance() {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ attempt: number; state: BalanceState } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getBalance(controller.signal)
      .then((balance) => setResult({ attempt, state: { status: 'ready', balance } }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const message =
          error instanceof ApiError && error.status === 403 ? NO_COMPANY_MESSAGE : GENERIC_MESSAGE
        setResult({ attempt, state: { status: 'error', message } })
      })
    return () => controller.abort()
  }, [attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const state: BalanceState = result?.attempt === attempt ? result.state : { status: 'loading' }
  return { state, retry }
}
