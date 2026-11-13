import { useCallback, useRef, useState } from 'react'
import { classifyInvitationError, type InvitationFailure } from '../model/invitationFailure'
import { rateLimitMessage, useCooldown } from './useCooldown'

const UNAVAILABLE_MESSAGE = 'Não foi possível concluir o aceite. Tente novamente.'
const FORBIDDEN_MESSAGE = 'Esta conta não tem permissão para aceitar este convite.'

export type SubmissionOutcome<T> =
  { ok: true; value: T } | { ok: false; failure: InvitationFailure }

/**
 * Envia um aceite por vez: ignora cliques repetidos enquanto a requisição está em andamento ou
 * durante a espera de um 429. Falhas genéricas viram mensagem local; as demais voltam a quem
 * chamou, que decide pelo `kind`.
 */
export function useAcceptSubmission() {
  const inFlight = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const { coolingDown, seconds, start } = useCooldown()

  const submit = useCallback(
    async <T>(action: () => Promise<T>): Promise<SubmissionOutcome<T> | null> => {
      if (inFlight.current || coolingDown) return null
      inFlight.current = true
      setSubmitting(true)
      setMessage('')
      try {
        return { ok: true, value: await action() }
      } catch (error) {
        const failure = classifyInvitationError(error)
        if (failure.kind === 'RATE_LIMITED') start(failure.retryAfterSeconds)
        else if (failure.kind === 'UNAVAILABLE') setMessage(UNAVAILABLE_MESSAGE)
        else if (failure.kind === 'FORBIDDEN') setMessage(FORBIDDEN_MESSAGE)
        return { ok: false, failure }
      } finally {
        inFlight.current = false
        setSubmitting(false)
      }
    },
    [coolingDown, start],
  )

  // O aviso do 429 dura exatamente a espera do Retry-After.
  const visibleMessage = coolingDown ? rateLimitMessage(seconds) : message
  return { submit, submitting, blocked: submitting || coolingDown, message: visibleMessage }
}

/** Falhas que a própria tela de aceite já explicou com uma mensagem local. */
export const isLocallyHandled = (failure: InvitationFailure) =>
  failure.kind === 'RATE_LIMITED' || failure.kind === 'UNAVAILABLE' || failure.kind === 'FORBIDDEN'
