import { useState } from 'react'
import { Button } from '@/shared/components/Button'
import { acceptInvitation } from '../../api/companyInvitations'
import { isLocallyHandled, useAcceptSubmission } from '../../hooks/useAcceptSubmission'
import type { InvitationFailure } from '../../model/invitationFailure'
import { TERMS_REQUIRED_MESSAGE, type Invitation } from '../../schemas/invitation'
import { TermsConsent } from './TermsConsent'

interface ExistingUserAcceptanceProps {
  invitation: Invitation
  token: string
  accountEmail: string
  onAccepted: () => void
  onFailure: (failure: InvitationFailure) => void
  onSwitchAccount: () => void
}

/** Depois do login/2FA, o vínculo só é criado com a confirmação explícita do usuário. */
export function ExistingUserAcceptance({
  invitation,
  token,
  accountEmail,
  onAccepted,
  onFailure,
  onSwitchAccount,
}: ExistingUserAcceptanceProps) {
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError] = useState<string>()
  const { submit, submitting, blocked, message } = useAcceptSubmission()

  async function handleConfirm() {
    if (blocked) return
    if (!termsAccepted) return setTermsError(TERMS_REQUIRED_MESSAGE)
    const outcome = await submit(() =>
      acceptInvitation({ token, termsVersion: invitation.terms.version }),
    )
    if (!outcome) return
    if (outcome.ok) return onAccepted()
    if (outcome.failure.kind === 'VALIDATION')
      return setTermsError(outcome.failure.fieldErrors.termsAccepted ?? TERMS_REQUIRED_MESSAGE)
    if (!isLocallyHandled(outcome.failure)) onFailure(outcome.failure)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        Você está conectado como{' '}
        <strong className="break-all text-slate-900">{accountEmail}</strong>. Confirme para vincular
        sua conta à empresa com o perfil indicado.
      </p>
      <TermsConsent
        terms={invitation.terms}
        checked={termsAccepted}
        disabled={submitting}
        error={termsError}
        onChange={(checked) => {
          setTermsAccepted(checked)
          if (checked) setTermsError(undefined)
        }}
      />
      {message && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
      <Button
        type="button"
        label={submitting ? 'Confirmando...' : 'Confirmar e acessar'}
        disabled={blocked}
        onClick={() => void handleConfirm()}
      />
      <Button
        type="button"
        variant="tertiary"
        label="Trocar de conta"
        disabled={submitting}
        onClick={onSwitchAccount}
      />
    </div>
  )
}
