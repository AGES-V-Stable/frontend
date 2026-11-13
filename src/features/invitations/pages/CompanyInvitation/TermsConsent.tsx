import { useId } from 'react'
import type { Invitation } from '../../schemas/invitation'

interface TermsConsentProps {
  terms: Invitation['terms']
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string
  disabled?: boolean
}

/** Aceite explícito dos termos vigentes; o checkbox sempre começa desmarcado. */
export function TermsConsent({ terms, checked, onChange, error, disabled }: TermsConsentProps) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-2">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="mt-1 h-4 w-4 accent-primary"
        />
        <label htmlFor={id} className="text-sm text-slate-700">
          Li e aceito os{' '}
          <a
            href={terms.termsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline"
          >
            Termos de uso
          </a>{' '}
          e a{' '}
          <a
            href={terms.privacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline"
          >
            Política de privacidade
          </a>
          .
        </label>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
