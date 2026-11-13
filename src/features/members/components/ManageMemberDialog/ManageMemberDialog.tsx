import { useId, useState } from 'react'
import { Button } from '@/shared/components/Button'
import { Modal } from '@/shared/components/Modal'
import type { MemberAction } from '../../model/memberActionError'
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '../../model/permissions'
import type { AssignableRole, Member } from '../../schemas/members'

export interface ManageMemberDialogProps {
  member: Member
  pending: MemberAction | null
  error: { action: MemberAction; message: string } | null
  onSave: (role: AssignableRole) => void
  onRemove: () => void
  onClose: () => void
}

export function ManageMemberDialog({
  member,
  pending,
  error,
  onSave,
  onRemove,
  onClose,
}: ManageMemberDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const [step, setStep] = useState<'manage' | 'confirm-remove'>('manage')
  const [role, setRole] = useState<AssignableRole>(member.role === 'VIEWER' ? 'VIEWER' : 'OPERATOR')
  // Enquanto uma ação está em andamento, o modal não fecha: o resultado sempre é apresentado.
  const busy = pending !== null
  const stepError = error?.action === (step === 'manage' ? 'update' : 'remove') ? error : null

  return (
    <Modal
      labelledBy={titleId}
      describedBy={descriptionId}
      busy={busy}
      focusKey={step}
      onClose={onClose}
    >
      {step === 'manage' ? (
        <>
          <header className="flex flex-col gap-1">
            <h2 id={titleId} className="text-xl font-semibold text-slate-900">
              Gerenciar membro
            </h2>
            <p id={descriptionId} className="text-sm text-slate-500">
              Altere o perfil de acesso ou remova o acesso desta pessoa à empresa.
            </p>
          </header>

          <div className="flex flex-col gap-1 rounded-lg border border-sage-300 p-4">
            <span className="font-medium text-slate-900">{member.name}</span>
            <span className="text-sm text-slate-500">{member.email}</span>
            <span className="mt-2 text-sm text-slate-700">
              Perfil atual: <strong>{ROLE_LABELS[member.role]}</strong>
            </span>
          </div>

          <fieldset className="flex flex-col gap-3" disabled={busy}>
            <legend className="mb-2 text-sm font-medium text-slate-900">Perfil de acesso</legend>
            {ASSIGNABLE_ROLES.map((option) => (
              <label
                key={option.role}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                  role === option.role ? 'border-primary bg-emerald-50' : 'border-sage-300'
                }`}
              >
                <input
                  type="radio"
                  name="member-role"
                  value={option.role}
                  checked={role === option.role}
                  onChange={() => setRole(option.role)}
                  className="mt-1 accent-primary"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-slate-900">
                    {ROLE_LABELS[option.role]}
                  </span>
                  <span className="text-xs text-slate-500">{option.description}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {stepError && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {stepError.message}
            </p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => setStep('confirm-remove')}
            className="self-start text-sm font-medium text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remover membro
          </button>

          <footer className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="neutral"
              label="Cancelar"
              disabled={busy}
              onClick={onClose}
              className="sm:!w-auto"
            />
            <Button
              type="button"
              label={pending === 'update' ? 'Salvando...' : 'Salvar alterações'}
              disabled={busy || role === member.role}
              onClick={() => onSave(role)}
              className="sm:!w-auto"
            />
          </footer>
        </>
      ) : (
        <>
          <header className="flex flex-col gap-2">
            <h2 id={titleId} className="text-xl font-semibold text-slate-900">
              Remover acesso de {member.name}?
            </h2>
            <p id={descriptionId} className="text-sm text-slate-600">
              {member.name} perderá o acesso à empresa e não poderá mais consultar ou operar a conta
              empresarial. A conta pessoal e o histórico de operações serão preservados.
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
              label="Manter membro"
              disabled={busy}
              onClick={() => setStep('manage')}
              className="sm:!w-auto"
            />
            <Button
              type="button"
              label={pending === 'remove' ? 'Removendo...' : 'Remover acesso'}
              disabled={busy}
              onClick={onRemove}
              className="!bg-red-700 hover:!bg-red-800 sm:!w-auto"
            />
          </footer>
        </>
      )}
    </Modal>
  )
}
