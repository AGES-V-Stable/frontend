import { useCallback, useRef, useState } from 'react'
import { removeMember, updateMemberRole } from '../api/members'
import { describeMemberActionError } from '../model/memberActionError'
import type { MemberAction } from '../model/memberActionError'
import { canManageMember, ROLE_LABELS } from '../model/permissions'
import type { MemberViewer } from '../model/permissions'
import type { AssignableRole, Member } from '../schemas/members'

export type MemberActionOutcome = { tone: 'success' | 'warning'; message: string }

/**
 * Alteração de perfil e remoção de um membro. Uma única ação por vez: cliques repetidos
 * enquanto a requisição está em andamento são ignorados antes mesmo de chegar à API.
 * Sucesso ou vínculo desatualizado chegam em `onSettled` (a lista deve ser recarregada);
 * as demais falhas ficam em `error`, preservando o estado para uma nova tentativa.
 */
export function useManageMember(
  companyId: string,
  viewer: MemberViewer,
  onSettled: (outcome: MemberActionOutcome) => void,
) {
  const inFlight = useRef(false)
  const [pending, setPending] = useState<MemberAction | null>(null)
  const [error, setError] = useState<{ action: MemberAction; message: string } | null>(null)

  const run = useCallback(
    async (
      action: MemberAction,
      member: Member,
      request: () => Promise<unknown>,
      successMessage: string,
    ) => {
      if (inFlight.current || !canManageMember(member, viewer)) return
      inFlight.current = true
      setPending(action)
      setError(null)
      try {
        await request()
        onSettled({ tone: 'success', message: successMessage })
      } catch (cause) {
        const failure = describeMemberActionError(cause, action)
        if (failure.stale) onSettled({ tone: 'warning', message: failure.message })
        else setError({ action, message: failure.message })
      } finally {
        inFlight.current = false
        setPending(null)
      }
    },
    [viewer, onSettled],
  )

  const save = useCallback(
    (member: Member, role: AssignableRole) =>
      run(
        'update',
        member,
        () => updateMemberRole(companyId, member, role),
        `Perfil de ${member.name} alterado para ${ROLE_LABELS[role]}.`,
      ),
    [companyId, run],
  )
  const remove = useCallback(
    (member: Member) =>
      run(
        'remove',
        member,
        () => removeMember(companyId, member),
        `O acesso de ${member.name} à empresa foi removido.`,
      ),
    [companyId, run],
  )
  const reset = useCallback(() => setError(null), [])

  return { pending, error, save, remove, reset }
}
