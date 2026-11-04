import { useCallback, useEffect, useState } from 'react'

import { getCompanyOptions } from '@/features/dashboard/api/companies'
import type { CompanyOption } from '@/features/dashboard/api/companies'

export type CompanyOptionsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; companies: CompanyOption[] }
  | { status: 'error' }

/** Carrega as empresas só quando `enabled` (visão administrativa). */
export function useCompanyOptions(enabled: boolean) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: number; state: CompanyOptionsState } | null>(null)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    getCompanyOptions(controller.signal)
      .then((companies) => setResult({ key: attempt, state: { status: 'ready', companies } }))
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key: attempt, state: { status: 'error' } })
      })
    return () => controller.abort()
  }, [enabled, attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const state: CompanyOptionsState = !enabled
    ? { status: 'idle' }
    : result?.key === attempt
      ? result.state
      : { status: 'loading' }
  return { state, retry }
}
