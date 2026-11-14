import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/shared/http/httpClient'
import { getMembers } from '../api/members'
import type { MemberListResponse } from '../schemas/members'

type LoadResult = { key: string; data?: MemberListResponse; failed?: boolean; denied?: boolean }

/** Lista paginada de membros da empresa; `reload` busca de novo a página atual. */
export function useMemberList(companyId: string) {
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<LoadResult | null>(null)
  const [data, setData] = useState<MemberListResponse | null>(null)
  const key = `${companyId}:${page}:${revision}`

  useEffect(() => {
    const controller = new AbortController()
    getMembers(companyId, page, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return
        // Uma remoção pode esvaziar a última página: volta para a última página existente.
        if (response.items.length === 0 && page > 0 && response.totalPages > 0) {
          setPage(response.totalPages - 1)
          return
        }
        setData(response)
        setResult({ key, data: response })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        // 403: o vínculo ou o perfil mudou; não é uma falha transitória para tentar de novo.
        const denied = error instanceof ApiError && error.status === 403
        setResult({ key, failed: !denied, denied })
      })
    return () => controller.abort()
  }, [companyId, page, key])

  const reload = useCallback(() => setRevision((value) => value + 1), [])
  const current = result?.key === key ? result : null
  return {
    data,
    loading: current === null,
    failed: current?.failed === true,
    /** O backend recusou a listagem: quem está na tela não gerencia mais os membros. */
    denied: current?.denied === true,
    page,
    setPage,
    reload,
  }
}
