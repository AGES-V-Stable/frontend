import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/Button'
import {
  get2faResetRequests,
  approve2faReset,
  reject2faReset,
  type TwoFactorResetRequest,
} from '@/features/auth/api/twoFactor'
import shieldIcon from '@/shared/assets/navigation/settings.svg'

export function AdminSecurityRequests() {
  const [requests, setRequests] = useState<TwoFactorResetRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')

  useEffect(() => {
    const controller = new AbortController()
    get2faResetRequests(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setRequests(data)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError('Não foi possível carregar as solicitações de segurança.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  async function handleApprove(id: string) {
    setActionInProgress(id)
    setFeedback(null)
    try {
      await approve2faReset(id)
      setRequests((prev) =>
        prev.map((req) =>
          req.id === id
            ? { ...req, status: 'APPROVED', reviewedAt: new Date().toISOString() }
            : req,
        ),
      )
      setFeedback(
        'Reset de 2FA aprovado com sucesso. Bloqueio de segurança de 48h ativado na conta.',
      )
    } catch {
      setError('Erro ao aprovar a solicitação. Tente novamente.')
    } finally {
      setActionInProgress(null)
    }
  }

  async function handleReject(id: string) {
    setActionInProgress(id)
    setFeedback(null)
    try {
      await reject2faReset(id)
      setRequests((prev) =>
        prev.map((req) =>
          req.id === id
            ? { ...req, status: 'REJECTED', reviewedAt: new Date().toISOString() }
            : req,
        ),
      )
      setFeedback('Solicitação de reset rejeitada.')
    } catch {
      setError('Erro ao rejeitar a solicitação. Tente novamente.')
    } finally {
      setActionInProgress(null)
    }
  }

  const filteredRequests = requests.filter((req) => {
    if (filter === 'ALL') return true
    return req.status === filter
  })

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <img src={shieldIcon} alt="" className="size-6" />
          <h1 className="text-2xl font-bold text-slate-900">
            Solicitações de Segurança (Reset de 2FA)
          </h1>
        </div>
        <p className="text-sm text-slate-500">
          Analise e aprove pedidos de recuperação de acesso para usuários que perderam seu
          autenticador e códigos de emergência.
        </p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 flex items-start gap-3">
        <span className="text-base shrink-0" aria-hidden="true">
          
        </span>
        <p>
          <strong>Regra de Proteção (Bloqueio de 48h):</strong> Ao aprovar uma solicitação, o 2FA do
          usuário é resetado e a conta entra automaticamente em bloqueio preventivo de segurança por{' '}
          <strong>48 horas</strong>, período durante o qual saques e transferências ficam
          temporariamente suspensos.
        </p>
      </div>

      {feedback && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-medium flex items-center justify-between"
        >
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold ml-4 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-800 text-sm font-medium"
        >
          {error}
        </div>
      )}

      {/* Filtros rápidos */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`text-sm px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
            filter === 'ALL' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Todas ({requests.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('PENDING')}
          className={`text-sm px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
            filter === 'PENDING' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pendentes ({requests.filter((r) => r.status === 'PENDING').length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('APPROVED')}
          className={`text-sm px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
            filter === 'APPROVED' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Aprovadas ({requests.filter((r) => r.status === 'APPROVED').length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('REJECTED')}
          className={`text-sm px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
            filter === 'REJECTED' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Rejeitadas ({requests.filter((r) => r.status === 'REJECTED').length})
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 text-sm">
          Carregando solicitações de segurança...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white border border-sage-300 rounded-xl text-sm">
          Nenhuma solicitação encontrada para o filtro selecionado.
        </div>
      ) : (
        <div className="flex flex-col gap-4" aria-label="Lista de solicitações de reset de 2FA">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-xl border border-sage-300 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
            >
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-slate-900 text-base">{req.userName}</span>
                  {req.companyName && (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {req.companyName}
                    </span>
                  )}
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      req.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {req.status === 'PENDING'
                      ? 'Pendente'
                      : req.status === 'APPROVED'
                        ? 'Aprovado (Bloqueio 48h)'
                        : 'Rejeitado'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                  <span>
                    <strong>E-mail:</strong> {req.userEmail}
                  </span>
                  {req.documentNumber && (
                    <span>
                      <strong>Documento:</strong> {req.documentNumber}
                    </span>
                  )}
                  <span>
                    <strong>Data:</strong> {new Date(req.requestedAt).toLocaleDateString('pt-BR')}{' '}
                    às{' '}
                    {new Date(req.requestedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-1">
                  <strong>Motivo:</strong> {req.reason}
                </p>
              </div>

              {req.status === 'PENDING' && (
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-[140px]">
                    <Button
                      type="button"
                      label={actionInProgress === req.id ? 'Processando...' : 'Aprovar Reset'}
                      variant="primary"
                      disabled={actionInProgress === req.id}
                      onClick={() => handleApprove(req.id)}
                      className="h-11 px-4 text-sm font-medium whitespace-nowrap"
                    />
                  </div>
                  <div className="w-[140px]">
                    <Button
                      type="button"
                      label="Rejeitar"
                      variant="secondary"
                      disabled={actionInProgress === req.id}
                      onClick={() => handleReject(req.id)}
                      className="h-11 px-4 text-sm font-medium whitespace-nowrap"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
