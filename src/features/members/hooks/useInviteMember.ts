import { useCallback, useRef, useState } from 'react'
import { ApiError } from '@/shared/http/httpClient'
import { createInvitation, getInvitationLink } from '../api/invitations'
import { describeInvitationError, existingInvitationId } from '../model/invitationError'
import type { InvitationFailure } from '../model/invitationError'
import type { GeneratedInvitation, InvitationForm } from '../schemas/members'

/** Convite criado agora ou, quando o e-mail já tinha um convite pendente, o convite existente. */
export interface InviteResult {
  generated: GeneratedInvitation
  existing: boolean
}

const EXISTING_WITHOUT_LINK: InvitationFailure = {
  message:
    'Já existe um convite pendente para este e-mail. Copie o link dele na lista de pessoas com acesso.',
  stale: false,
}

/**
 * Criação de convite. Um único envio por vez: cliques repetidos enquanto a requisição está em
 * andamento são ignorados antes de chegar à API. O link fica apenas no estado em memória e é
 * descartado em `reset`. `onChanged` avisa que a lista de pessoas deve ser recarregada.
 */
export function useInviteMember(companyId: string, onChanged: () => void) {
  const inFlight = useRef(false)
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<InvitationFailure | null>(null)
  const [result, setResult] = useState<InviteResult | null>(null)

  const showExisting = useCallback(
    async (invitationId: string) => {
      try {
        setResult({ generated: await getInvitationLink(companyId, invitationId), existing: true })
      } catch {
        setFailure(EXISTING_WITHOUT_LINK)
      }
      onChanged()
    },
    [companyId, onChanged],
  )

  const submit = useCallback(
    async (form: InvitationForm) => {
      if (inFlight.current) return
      inFlight.current = true
      setPending(true)
      setFailure(null)
      try {
        setResult({ generated: await createInvitation(companyId, form), existing: false })
        onChanged()
      } catch (cause) {
        const existingId = existingInvitationId(cause)
        if (existingId) await showExisting(existingId)
        // Sem o id do convite existente, repetir só geraria o mesmo 409: orienta a copiar pela lista.
        else if (cause instanceof ApiError && cause.code === 'INVITATION_ALREADY_EXISTS')
          setFailure(EXISTING_WITHOUT_LINK)
        else setFailure(describeInvitationError(cause, 'create'))
      } finally {
        inFlight.current = false
        setPending(false)
      }
    },
    [companyId, onChanged, showExisting],
  )

  const clearFailure = useCallback(() => setFailure(null), [])
  const reset = useCallback(() => {
    setFailure(null)
    setResult(null)
  }, [])

  return { pending, failure, result, submit, clearFailure, reset }
}
