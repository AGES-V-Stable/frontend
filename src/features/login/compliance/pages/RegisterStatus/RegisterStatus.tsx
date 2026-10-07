import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/shared/components/Button'
import { getCurrentUser } from '@/shared/services/user'
import { getCompanyComplianceStatus } from '@/shared/services/company'
import { ComplianceStatusCard } from '@/features/login/compliance/components/ComplianceStatusCard/ComplianceStatusCard'
import type { ComplianceStatus } from '@/features/login/compliance/components/ComplianceStatusCard/ComplianceStatusType'

function RegisterStatus() {
  const [status, setStatus] = useState<ComplianceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback((signal?: AbortSignal) => {
    return getCurrentUser(signal)
      .then(async (user) => {
        if (signal?.aborted) return
        if (!user.companyId) throw new Error('Missing company')
        const result = await getCompanyComplianceStatus(user.companyId, signal)
        if (!signal?.aborted)
          setStatus(
            result === 'APPROVED'
              ? 'APPROVED'
              : result === 'REJECTED'
                ? 'NOT_APPROVED'
                : 'IN_REVIEW',
          )
      })
      .catch(() => {
        if (!signal?.aborted)
          setError('Não foi possível carregar a situação cadastral. Tente novamente.')
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false)
      })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  function refresh() {
    setLoading(true)
    setError('')
    void load()
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-100 p-6">
      {loading && !status && <p role="status">Carregando situação cadastral...</p>}
      {error && (
        <div role="alert" className="text-red-700">
          <p>{error}</p>
          <Button label="Tentar novamente" onClick={refresh} disabled={loading} />
        </div>
      )}
      {status && <ComplianceStatusCard status={status} onRefresh={refresh} refreshing={loading} />}
      <p className="text-sm text-slate-500">
        Precisa de ajuda? Entre em contato com o suporte da V-Stable.
      </p>
    </main>
  )
}

export { RegisterStatus }
