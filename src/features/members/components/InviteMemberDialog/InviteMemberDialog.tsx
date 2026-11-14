import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Modal } from '@/shared/components/Modal'
import type { InviteResult } from '../../hooks/useInviteMember'
import type { InvitationFailure } from '../../model/invitationError'
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '../../model/permissions'
import { InvitationFormSchema } from '../../schemas/members'
import type { AssignableRole, InvitationForm } from '../../schemas/members'
import { InvitationLink } from '../InvitationLink'

export interface InviteMemberDialogProps {
  pending: boolean
  failure: InvitationFailure | null
  result: InviteResult | null
  onSubmit: (form: InvitationForm) => void
  /** O e-mail recusado pelo servidor foi editado: a falha anterior deixa de valer. */
  onEmailEdit: () => void
  onClose: () => void
}

type Field = keyof InvitationForm
type FieldErrors = Partial<Record<Field, string>>

const isField = (key: PropertyKey | undefined): key is Field =>
  key === 'name' || key === 'email' || key === 'role'

function focusField(id: string, select = false) {
  const input = document.getElementById(id) as HTMLInputElement | null
  input?.focus()
  if (select) input?.select()
}

/**
 * "Adicionar membro": nome, e-mail e perfil (Operador ou Visualizador). Fechar antes de criar
 * não cria convite; fechar depois de criar não revoga o convite criado.
 */
export function InviteMemberDialog({
  pending,
  failure,
  result,
  onSubmit,
  onEmailEdit,
  onClose,
}: InviteMemberDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const nameId = useId()
  const emailId = useId()
  const roleId = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AssignableRole | ''>('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const emailFailure = failure?.field === 'email' ? failure : null
  const generalFailure = failure && !failure.field ? failure : null

  useEffect(() => focusField(nameId), [nameId])
  useEffect(() => {
    if (emailFailure) focusField(emailId)
  }, [emailFailure, emailId])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (pending) return
    const parsed = InvitationFormSchema.safeParse({ name, email, role })
    if (parsed.success) {
      setErrors({})
      onSubmit(parsed.data)
      return
    }
    const next: FieldErrors = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (isField(field)) next[field] ??= issue.message
    }
    setErrors(next)
    focusField(next.name ? nameId : next.email ? emailId : roleId)
  }

  const editEmail = (value: string) => {
    setEmail(value)
    setErrors((current) => ({ ...current, email: undefined }))
    if (emailFailure) onEmailEdit()
  }

  if (result) {
    const invited = result.generated.invitation
    return (
      <Modal labelledBy={titleId} describedBy={descriptionId} focusKey="result" onClose={onClose}>
        <header className="flex flex-col gap-2">
          <h2 id={titleId} className="text-xl font-semibold text-slate-900">
            {result.existing
              ? `Já existe um convite pendente para ${invited.name}`
              : `Convite criado para ${invited.name}`}
          </h2>
          <p id={descriptionId} className="text-sm text-slate-600">
            {result.existing
              ? 'Nenhum convite novo foi criado. Copie o link do convite pendente e envie para a pessoa.'
              : 'Copie o link e envie para a pessoa pelo canal de sua preferência. Ela aparece na lista como convite pendente até aceitar.'}
          </p>
        </header>
        <div className="flex flex-col gap-1 rounded-lg border border-sage-300 p-4">
          <span className="font-medium text-slate-900">{invited.name}</span>
          <span className="text-sm text-slate-500">{invited.email}</span>
          <span className="mt-2 text-sm text-slate-700">
            Perfil de acesso: <strong>{ROLE_LABELS[invited.role]}</strong>
          </span>
        </div>
        <InvitationLink key={result.generated.inviteUrl} inviteUrl={result.generated.inviteUrl} />
        <footer className="flex justify-end">
          <Button type="button" label="Concluir" onClick={onClose} className="sm:!w-auto" />
        </footer>
      </Modal>
    )
  }

  return (
    <Modal
      labelledBy={titleId}
      describedBy={descriptionId}
      busy={pending}
      focusKey="form"
      onClose={onClose}
    >
      <header className="flex flex-col gap-1">
        <h2 id={titleId} className="text-xl font-semibold text-slate-900">
          Adicionar membro
        </h2>
        <p id={descriptionId} className="text-sm text-slate-500">
          Crie um convite e compartilhe o link com a pessoa que vai acessar a conta da empresa.
        </p>
      </header>

      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <Input
          id={nameId}
          label="Nome"
          value={name}
          autoComplete="off"
          maxLength={255}
          disabled={pending}
          error={errors.name}
          onChange={(event) => {
            setName(event.target.value)
            setErrors((current) => ({ ...current, name: undefined }))
          }}
        />
        <div className="flex flex-col gap-2">
          <Input
            id={emailId}
            type="email"
            label="E-mail"
            value={email}
            autoComplete="off"
            maxLength={255}
            disabled={pending}
            error={errors.email ?? emailFailure?.message}
            onChange={(event) => editEmail(event.target.value)}
          />
          {emailFailure && (
            <button
              type="button"
              onClick={() => focusField(emailId, true)}
              className="self-start text-sm font-medium text-primary hover:underline"
            >
              Corrigir e-mail
            </button>
          )}
        </div>

        <fieldset className="flex flex-col gap-3" disabled={pending}>
          <legend className="mb-2 text-sm font-medium text-slate-900">Perfil de acesso</legend>
          {ASSIGNABLE_ROLES.map((option, index) => (
            <label
              key={option.role}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                role === option.role ? 'border-primary bg-emerald-50' : 'border-sage-300'
              }`}
            >
              <input
                id={index === 0 ? roleId : undefined}
                type="radio"
                name="invitation-role"
                value={option.role}
                checked={role === option.role}
                aria-invalid={Boolean(errors.role)}
                onChange={() => {
                  setRole(option.role)
                  setErrors((current) => ({ ...current, role: undefined }))
                }}
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
          {errors.role && (
            <p role="alert" className="text-sm text-red-700">
              {errors.role}
            </p>
          )}
        </fieldset>

        {generalFailure && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {generalFailure.message}
          </p>
        )}

        <footer className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="neutral"
            label="Cancelar"
            disabled={pending}
            onClick={onClose}
            className="sm:!w-auto"
          />
          <Button
            type="submit"
            label={pending ? 'Criando convite...' : 'Criar convite'}
            disabled={pending}
            className="sm:!w-auto"
          />
        </footer>
      </form>
    </Modal>
  )
}
