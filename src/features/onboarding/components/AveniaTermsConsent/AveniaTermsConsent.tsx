import { useId } from 'react'
import type { AveniaTerms } from '@/features/onboarding/api/compliance'

const DOCUMENT_NAMES: Record<string, string> = {
  TERMS_OF_USE: 'Termos de uso',
  PRIVACY_POLICY: 'Política de privacidade',
}

interface AveniaTermsConsentProps {
  terms: AveniaTerms | null
  loadFailed: boolean
  checked: boolean
  error: string
  onCheck: (checked: boolean) => void
  onRetry: () => void
}

/** Exibe os documentos vigentes da Avenia e coleta o aceite explícito do titular. */
export function AveniaTermsConsent({
  terms,
  loadFailed,
  checked,
  error,
  onCheck,
  onRetry,
}: AveniaTermsConsentProps) {
  const id = useId()
  const errorId = `${id}-error`

  if (loadFailed) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700"
      >
        Não foi possível carregar os termos da Avenia.{' '}
        <button type="button" onClick={onRetry} className="font-medium underline">
          Tentar novamente
        </button>
      </div>
    )
  }
  if (!terms) {
    return (
      <p role="status" className="text-sm text-slate-600">
        Carregando os termos da Avenia...
      </p>
    )
  }
  if (terms.accepted) {
    return (
      <p
        role="status"
        className="rounded-lg border border-primary bg-emerald-50 p-4 text-sm text-primary"
      >
        Termos da Avenia aceitos.
      </p>
    )
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="rounded-lg border border-sage-300 bg-surface p-4"
    >
      <h3 id={`${id}-title`} className="text-sm font-semibold text-slate-900">
        Termos da Avenia
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        A verificação de identidade é feita pela Avenia, que exige o aceite dos documentos abaixo.
      </p>
      <ul className="mt-3 space-y-1">
        {terms.documents.map((document) => (
          <li key={document.url}>
            <a
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary underline"
            >
              {(document.key && DOCUMENT_NAMES[document.key]) ?? document.name ?? 'Documento'}
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-start gap-2">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheck(event.target.checked)}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="mt-1 h-4 w-4 accent-primary"
        />
        <label htmlFor={id} className="text-sm text-slate-700">
          Li e aceito os termos de uso e a política de privacidade da Avenia.
        </label>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  )
}
