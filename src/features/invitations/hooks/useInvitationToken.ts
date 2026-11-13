import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { PATHS } from '@/shared/navigation/paths'
import {
  clearInvitationToken,
  readInvitationToken,
  saveInvitationToken,
  tokenFromHash,
} from '../model/invitationToken'

/**
 * Token do convite aberto nesta aba. Ao chegar pelo link, guarda o token na aba e remove o
 * fragmento da barra de endereços; ao voltar do login, recupera o token guardado. O valor fica
 * fixo durante a tela, mesmo depois de descartado do armazenamento por uma invalidação.
 */
export function useInvitationToken(): string | null {
  const { hash } = useLocation()
  const navigate = useNavigate()
  const [current, setCurrent] = useState(() => ({
    hash,
    token: hash ? tokenFromHash(hash) : readInvitationToken(),
  }))
  // Um novo link aberto com a tela já montada substitui o convite anterior.
  if (hash && hash !== current.hash) setCurrent({ hash, token: tokenFromHash(hash) })

  useEffect(() => {
    if (!hash) return
    const token = tokenFromHash(hash)
    if (token) saveInvitationToken(token)
    else clearInvitationToken()
    void navigate(PATHS.COMPANY_INVITATION, { replace: true })
  }, [hash, navigate])

  return current.token
}
