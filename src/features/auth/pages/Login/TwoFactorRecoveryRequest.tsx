import { useState } from 'react'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { request2faRecovery } from '@/features/auth/api/twoFactor'
import clockIcon from '@/shared/assets/iconClock/clock.svg'

export interface TwoFactorRecoveryRequestProps {
  initialEmail?: string
  onCancel: () => void
  onSuccess?: () => void
}

export function TwoFactorRecoveryRequest({
  initialEmail = '',
  onCancel,
  onSuccess,
}: TwoFactorRecoveryRequestProps) {
  const [email, setEmail] = useState(initialEmail)
  const [fullName, setFullName] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !fullName.trim() || !documentNumber.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await request2faRecovery({
        email: email.trim(),
        fullName: fullName.trim(),
        documentNumber: documentNumber.trim(),
        reason: reason.trim(),
      })
      setSubmitted(true)
      onSuccess?.()
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Não foi possível enviar a solicitação. Tente novamente.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-6 w-[560px] p-8 rounded-xl border border-sage-300 bg-white shadow-xs text-center items-center">
        <img className="p-4 bg-blue-50 rounded-full size-16" src={clockIcon} alt="" />
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-sky-700">
          Solicitação em análise
        </span>

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-slate-900">Solicitação enviada com sucesso</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Sua solicitação de recuperação de 2FA foi recebida e está em análise pelo Administrador.
            Você será notificado por e-mail assim que a análise for concluída.
          </p>
        </div>

        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-left w-full">
          <div className="flex items-start gap-2.5">
            <span className="text-lg shrink-0" aria-hidden="true"></span>
            <div className="flex flex-col gap-1 text-xs text-amber-900">
              <strong className="font-semibold">Aviso de Segurança (Bloqueio de 48h)</strong>
              <p>
                Por medidas de segurança e conformidade, após a aprovação do reset pelo
                Administrador,{' '}
                <strong>saques e transferências ficarão bloqueados por 48 horas</strong> na sua
                conta para proteger seus fundos.
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          label="Voltar para o login"
          variant="primary"
          onClick={onCancel}
          className="w-full"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 w-[560px] p-8 rounded-xl border border-sage-300 bg-white shadow-xs">
      <div className="flex flex-col gap-1 text-center">
        <h2 className="text-xl font-bold text-slate-900">Recuperação de Acesso (2FA)</h2>
        <p className="text-sm text-slate-500">
          Informe seus dados para solicitar o reset administrativo do seu segundo fator.
        </p>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
        <span className="text-base shrink-0" aria-hidden="true"></span>
        <p>
          <strong>Importante:</strong> Esta solicitação passará por análise manual da equipe de
          compliance. Após a aprovação, saques e transferências ficarão bloqueados por 48 horas por
          segurança.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          id="recovery-email"
          label="E-mail da conta*"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />

        <Input
          id="recovery-fullName"
          label="Nome completo do titular*"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={submitting}
        />

        <Input
          id="recovery-documentNumber"
          label="CPF ou Documento de Identificação*"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          disabled={submitting}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="recovery-reason" className="text-sm text-sage-800 font-medium">
            Motivo da solicitação*
          </label>
          <textarea
            id="recovery-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
            className="w-full rounded-lg border border-sage-300 bg-surface p-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 font-medium">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 mt-2">
          <Button
            type="submit"
            label={submitting ? 'Enviando solicitação...' : 'Enviar solicitação para análise'}
            variant="primary"
            disabled={submitting}
          />
          <Button
            type="button"
            label="Voltar para a verificação"
            variant="secondary"
            onClick={onCancel}
            disabled={submitting}
          />
        </div>
      </form>
    </div>
  )
}
