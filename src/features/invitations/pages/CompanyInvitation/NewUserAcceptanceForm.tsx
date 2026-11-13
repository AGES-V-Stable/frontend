import { useState } from 'react'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { acceptInvitationAsNewUser } from '../../api/companyInvitations'
import { isLocallyHandled, useAcceptSubmission } from '../../hooks/useAcceptSubmission'
import type { InvitationFailure } from '../../model/invitationFailure'
import {
  validateNewUserForm,
  type Invitation,
  type NewUserFormData,
  type NewUserFormErrors,
} from '../../schemas/invitation'
import { TermsConsent } from './TermsConsent'

interface NewUserAcceptanceFormProps {
  invitation: Invitation
  token: string
  onCreated: () => void
  onFailure: (failure: InvitationFailure) => void
  onCancel: () => void
}

/**
 * Cadastro do convidado sem conta: nome, e-mail, empresa e perfil vêm do convite; aqui o
 * usuário só define a senha e aceita os termos. O acesso criado segue para o login normal.
 */
export function NewUserAcceptanceForm({
  invitation,
  token,
  onCreated,
  onFailure,
  onCancel,
}: NewUserAcceptanceFormProps) {
  const [form, setForm] = useState<NewUserFormData>({
    password: '',
    confirmPassword: '',
    termsAccepted: false,
  })
  const [errors, setErrors] = useState<NewUserFormErrors>({})
  const { submit, submitting, blocked, message } = useAcceptSubmission()

  function change<K extends keyof NewUserFormData>(field: K, value: NewUserFormData[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (blocked) return
    const nextErrors = validateNewUserForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    const outcome = await submit(() =>
      acceptInvitationAsNewUser({
        token,
        password: form.password,
        confirmPassword: form.confirmPassword,
        termsVersion: invitation.terms.version,
      }),
    )
    if (!outcome) return
    if (outcome.ok) return onCreated()
    if (outcome.failure.kind === 'VALIDATION') return setErrors(outcome.failure.fieldErrors)
    if (!isLocallyHandled(outcome.failure)) onFailure(outcome.failure)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        Crie a senha do seu acesso. Você entrará com o e-mail{' '}
        <strong className="break-all text-slate-900">{invitation.recipient.email}</strong>.
      </p>
      <Input
        id="invitation-password"
        label="Senha"
        type="password"
        autoComplete="new-password"
        value={form.password}
        error={errors.password}
        disabled={submitting}
        onChange={(event) => change('password', event.target.value)}
      />
      <Input
        id="invitation-confirm-password"
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        value={form.confirmPassword}
        error={errors.confirmPassword}
        disabled={submitting}
        onChange={(event) => change('confirmPassword', event.target.value)}
      />
      <p className="-mt-2 text-xs text-slate-500">
        Use ao menos 8 caracteres, com um número e um caractere especial.
      </p>
      <TermsConsent
        terms={invitation.terms}
        checked={form.termsAccepted}
        disabled={submitting}
        error={errors.termsAccepted}
        onChange={(checked) => change('termsAccepted', checked)}
      />
      {message && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
      <Button
        type="submit"
        label={submitting ? 'Criando acesso...' : 'Aceitar e acessar'}
        disabled={blocked}
      />
      <Button
        type="button"
        variant="tertiary"
        label="Cancelar"
        disabled={submitting}
        onClick={onCancel}
      />
    </form>
  )
}
