import { useCallback, useEffect, useState } from 'react'
import { resolveInvitation } from '../api/companyInvitations'
import {
  classifyInvitationError,
  isTerminalTokenFailure,
  type InvitationFailure,
} from '../model/invitationFailure'
import { clearInvitationToken } from '../model/invitationToken'
import type { Invitation } from '../schemas/invitation'

export type InvitationResolution =
  | { status: 'loading' }
  | { status: 'ready'; invitation: Invitation }
  | { status: 'failed'; failure: InvitationFailure }

const MISSING_TOKEN: InvitationResolution = { status: 'failed', failure: { kind: 'INVALID' } }

/** Consulta o convite (sem consumi-lo) e descarta o token quando o link deixou de valer. */
export function useInvitationResolution(token: string | null) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; state: InvitationResolution } | null>(null)
  const key = `${attempt}:${token ?? ''}`

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    resolveInvitation(token, controller.signal)
      .then((invitation) => setResult({ key, state: { status: 'ready', invitation } }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const failure = classifyInvitationError(error)
        if (isTerminalTokenFailure(failure)) clearInvitationToken()
        setResult({ key, state: { status: 'failed', failure } })
      })
    return () => controller.abort()
  }, [token, key])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])
  const state: InvitationResolution = !token
    ? MISSING_TOKEN
    : result?.key === key
      ? result.state
      : { status: 'loading' }
  return { state, reload }
}
