import { useCallback, useRef, useState } from 'react'
import { getInvitationLink, regenerateInvitationLink, revokeInvitation } from '../api/invitations'
import { copyText } from '../model/clipboard'
import { describeInvitationError } from '../model/invitationError'
import type { InvitationAction } from '../model/invitationError'
import type { Invitation } from '../schemas/members'
import type { MemberActionOutcome } from './useManageMember'

type PendingAction = Exclude<InvitationAction, 'create'>

/** Convite aberto em "Gerenciar convite"; o link só existe aqui, em memória. */
export interface ActiveInvitation {
  invitation: Invitation
  inviteUrl: string | null
  notice: MemberActionOutcome | null
}

const MANUAL_COPY_NOTICE: MemberActionOutcome = {
  tone: 'warning',
  message: 'Não foi possível copiar automaticamente. Selecione o link abaixo e copie manualmente.',
}

/**
 * Cópia do link a partir da linha, regeneração e revogação de convites pendentes. Uma ação por
 * vez. Copiar busca o link vigente (sem gerar token novo); só "Gerar novo link" troca o token.
 * `report` exibe o resultado na página e `reload` recarrega a lista de pessoas.
 */
export function useInvitationActions(
  companyId: string,
  report: (outcome: MemberActionOutcome) => void,
  reload: () => void,
) {
  const inFlight = useRef(false)
  const [pending, setPending] = useState<{ action: PendingAction; invitationId: string } | null>(
    null,
  )
  const [error, setError] = useState<{ action: PendingAction; message: string } | null>(null)
  const [active, setActive] = useState<ActiveInvitation | null>(null)

  const run = useCallback(
    async (
      action: PendingAction,
      invitation: Invitation,
      request: () => Promise<void>,
      onFailure: (message: string) => void,
    ): Promise<boolean> => {
      if (inFlight.current || invitation.status !== 'PENDING') return false
      inFlight.current = true
      setPending({ action, invitationId: invitation.id })
      setError(null)
      try {
        await request()
        return true
      } catch (cause) {
        const failure = describeInvitationError(cause, action)
        if (failure.stale) {
          setActive(null)
          report({ tone: 'warning', message: failure.message })
          reload()
        } else onFailure(failure.message)
        return false
      } finally {
        inFlight.current = false
        setPending(null)
      }
    },
    [report, reload],
  )

  const copyFromRow = useCallback(
    (invitation: Invitation) =>
      run(
        'link',
        invitation,
        async () => {
          const generated = await getInvitationLink(companyId, invitation.id)
          if (await copyText(generated.inviteUrl))
            report({ tone: 'success', message: `Link copiado. Envie para ${invitation.name}.` })
          else
            setActive({
              invitation: generated.invitation,
              inviteUrl: generated.inviteUrl,
              notice: MANUAL_COPY_NOTICE,
            })
        },
        (message) => report({ tone: 'warning', message }),
      ),
    [companyId, run, report],
  )

  const regenerate = useCallback(async () => {
    if (!active) return false
    return run(
      'regenerate',
      active.invitation,
      async () => {
        const generated = await regenerateInvitationLink(companyId, active.invitation)
        setActive({
          invitation: generated.invitation,
          inviteUrl: generated.inviteUrl,
          notice: {
            tone: 'success',
            message: 'Novo link gerado. O link anterior não funciona mais.',
          },
        })
        reload()
      },
      (message) => setError({ action: 'regenerate', message }),
    )
  }, [active, companyId, run, reload])

  const revoke = useCallback(async () => {
    if (!active) return false
    const { invitation } = active
    return run(
      'revoke',
      invitation,
      async () => {
        await revokeInvitation(companyId, invitation)
        setActive(null)
        report({
          tone: 'success',
          message: `Convite de ${invitation.name} revogado. O link não funciona mais.`,
        })
        reload()
      },
      (message) => setError({ action: 'revoke', message }),
    )
  }, [active, companyId, run, report, reload])

  const open = useCallback((invitation: Invitation) => {
    setError(null)
    setActive({ invitation, inviteUrl: null, notice: null })
  }, [])

  const close = useCallback(() => {
    if (inFlight.current) return
    setError(null)
    setActive(null)
  }, [])

  return { active, pending, error, open, close, copyFromRow, regenerate, revoke }
}
