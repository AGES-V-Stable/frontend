import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/shared/http/httpClient'
import { getOwnMembership } from '../api/members'
import type { Member } from '../schemas/members'

/** `revoked`: o backend recusou o vínculo; `failed`: falha transitória, com nova tentativa. */
export type OwnMembershipFailure = 'revoked' | 'failed'

type LoadResult = { key: string; member?: Member; failure?: OwnMembershipFailure }

const ACCESS_LOSS_CODES = new Set(['COMPANY_ACCESS_REVOKED', 'COMPANY_ACCESS_DENIED'])

/** Consulta o próprio vínculo com a empresa; `reload` repete a consulta. */
export function useOwnMembership(companyId: string) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<LoadResult | null>(null)
  const key = `${companyId}:${revision}`

  useEffect(() => {
    const controller = new AbortController()
    getOwnMembership(companyId, controller.signal)
      .then((member) => {
        if (!controller.signal.aborted) setResult({ key, member })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const revoked = error instanceof ApiError && ACCESS_LOSS_CODES.has(error.code ?? '')
        setResult({ key, failure: revoked ? 'revoked' : 'failed' })
      })
    return () => controller.abort()
  }, [companyId, key])

  const reload = useCallback(() => setRevision((value) => value + 1), [])
  const current = result?.key === key ? result : null
  return {
    member: current?.member ?? null,
    loading: current === null,
    failure: current?.failure ?? null,
    reload,
  }
}
