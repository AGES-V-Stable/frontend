import { useId, useState } from 'react'
import { Button } from '@/shared/components/Button'
import { Modal } from '@/shared/components/Modal'
import { StatusBadge } from '@/shared/components/Table'
import type { MemberActionOutcome } from '../../hooks/useManageMember'
import type { InvitationAction } from '../../model/invitationError'
import { ROLE_LABELS } from '../../model/permissions'
import type { Invitation } from '../../schemas/members'
import { InvitationLink } from '../InvitationLink'

type InvitationDialogAction = Exclude<InvitationAction, 'create'>

export interface ManageInvitationDialogProps {
  invitation: Invitation
  /** Link em memória, presente depois de regenerar ou quando a cópia pela linha falhou. */
  inviteUrl: string | null
  notice: MemberActionOutcome | null
  pending: InvitationDialogAction | null
  error: { action: InvitationDialogAction; message: string } | null
  /** Resolve true quando o novo link foi gerado. */
  onRegenerate: () => Promise<boolean>
  onRevoke: () => void
  onClose: () => void
}

type Step = 'manage' | 'confirm-regenerate' | 'confirm-revoke'

/** Gerar novo link e revogar são ações separadas, explícitas e confirmadas. */
export function ManageInvitationDialog({
  invitation,
  inviteUrl,
  notice,
  pending,
  error,
  onRegenerate,
  onRevoke,
  onClose,
}: ManageInvitationDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const [step, setStep] = useState<Step>('manage')
  const busy = pending !== null
  const stepError =
    (step === 'confirm-regenerate' && error?.action === 'regenerate') ||
    (step === 'confirm-revoke' && error?.action === 'revoke')
      ? error
      : null

  const regenerate = async () => {
    if (await onRegenerate()) setStep('manage')
  }

  return (
    <Modal
      labelledBy={titleId}
      describedBy={descriptionId}
      busy={busy}
      focusKey={step}
      onClose={onClose}
    >
      {step === 'manage' && (
        <>
          <header className="flex flex-col gap-1">
            <h2 id={titleId} className="text-xl font-semibold text-slate-900">
              Gerenciar convite
            </h2>
            <p id={descriptionId} className="text-sm text-slate-500">
              Gere um novo link ou revogue o convite pendente desta pessoa.
            </p>
          </header>

          <div className="flex flex-col gap-1 rounded-lg border border-sage-300 p-4">
            <span className="font-medium text-slate-900">{invitation.name}</span>
            <span className="text-sm text-slate-500">{invitation.email}</span>
            <span className="mt-2 flex items-center gap-2 text-sm text-slate-700">
              Perfil de acesso: <strong>{ROLE_LABELS[invitation.role]}</strong>
            </span>
            <span className="mt-1">
              <StatusBadge label="Convite pendente" variant="warning" />
            </span>
          </div>

          {notice && (
            <p
              role={notice.tone === 'success' ? 'status' : 'alert'}
              className={`rounded-lg p-3 text-sm ${
                notice.tone === 'success'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-amber-50 text-amber-800'
              }`}
            >
              {notice.message}
            </p>
          )}
          {inviteUrl && <InvitationLink key={inviteUrl} inviteUrl={inviteUrl} />}

          <div className="flex flex-col items-start gap-3">
            <Button
              type="button"
              variant="secondary"
              label="Gerar novo link"
              disabled={busy}
              onClick={() => setStep('confirm-regenerate')}
              className="!w-auto"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep('confirm-revoke')}
              className="text-sm font-medium text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              Revogar convite
            </button>
          </div>

          <footer className="flex justify-end">
            <Button
              type="button"
              variant="neutral"
              label="Fechar"
              disabled={busy}
              onClick={onClose}
              className="sm:!w-auto"
            />
          </footer>
        </>
      )}

      {step === 'confirm-regenerate' && (
        <>
          <header className="flex flex-col gap-2">
            <h2 id={titleId} className="text-xl font-semibold text-slate-900">
              Gerar novo link para {invitation.name}?
            </h2>
            <p id={descriptionId} className="text-sm text-slate-600">
              O link atual deixará de funcionar imediatamente. Depois, copie o novo link e envie
              para a pessoa convidada.
            </p>
          </header>
          {stepError && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {stepError.message}
            </p>
          )}
          <footer className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="neutral"
              label="Manter link atual"
              disabled={busy}
              onClick={() => setStep('manage')}
              className="sm:!w-auto"
            />
            <Button
              type="button"
              label={pending === 'regenerate' ? 'Gerando link...' : 'Gerar novo link'}
              disabled={busy}
              onClick={() => void regenerate()}
              className="sm:!w-auto"
            />
          </footer>
        </>
      )}

      {step === 'confirm-revoke' && (
        <>
          <header className="flex flex-col gap-2">
            <h2 id={titleId} className="text-xl font-semibold text-slate-900">
              Revogar convite de {invitation.name}?
            </h2>
            <p id={descriptionId} className="text-sm text-slate-600">
              O link deixará de funcionar e {invitation.name} sairá da lista de pessoas. Para
              convidar novamente, crie outro convite.
            </p>
          </header>
          {stepError && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {stepError.message}
            </p>
          )}
          <footer className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="neutral"
              label="Manter convite"
              disabled={busy}
              onClick={() => setStep('manage')}
              className="sm:!w-auto"
            />
            <Button
              type="button"
              label={pending === 'revoke' ? 'Revogando...' : 'Revogar convite'}
              disabled={busy}
              onClick={onRevoke}
              className="!bg-red-700 hover:!bg-red-800 sm:!w-auto"
            />
          </footer>
        </>
      )}
    </Modal>
  )
}
