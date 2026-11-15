import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/shared/components/Button'
import {
  loadIndividualKycRfi,
  submitIndividualKycRfi,
  uploadIndividualKycRfiDocument,
} from '@/features/onboarding/api/blindpayIndividualKyc'
import type {
  IndividualKycRfi,
  IndividualKycRfiField,
  IndividualKycStatus,
  RfiAnswer,
} from '@/features/onboarding/api/blindpayIndividualKyc'
import { kycErrorMessage } from './kycStatus'
import { validateBlindPayUpload } from './validation'

const fieldClasses =
  'w-full rounded-lg border border-sage-500 bg-surface px-4 py-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-primary'

/** Campo de documento: a BlindPay indica o tipo de documento ou aceita vários arquivos. */
function isDocumentField(field: IndividualKycRfiField) {
  return Boolean(field.documentType) || field.multiple
}

interface Props {
  onSubmitted: (status: IndividualKycStatus) => void
}

/**
 * Responde o pedido de informações (RFI) da BlindPay. Os campos vêm do provedor:
 * texto, lista de opções ou documentos (enviados um a um e respondidos por URL).
 */
export function BlindPayRfiForm({ onSubmitted }: Props) {
  const [rfi, setRfi] = useState<IndividualKycRfi | null>(null)
  const [loadError, setLoadError] = useState('')
  const [answers, setAnswers] = useState<Record<string, RfiAnswer>>({})
  const [fileNames, setFileNames] = useState<Record<string, string[]>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let current = true
    loadIndividualKycRfi()
      .then((value) => {
        if (current) setRfi(value)
      })
      .catch((error: unknown) => {
        if (current)
          setLoadError(kycErrorMessage(error, 'Não foi possível carregar o pedido de informações.'))
      })
    return () => {
      current = false
    }
  }, [])

  async function addFile(field: IndividualKycRfiField, file: File | null) {
    if (!file) return
    const issue = validateBlindPayUpload(file, 'proof')
    if (issue) {
      setErrors((previous) => ({ ...previous, [field.key]: issue }))
      return
    }
    setBusy(true)
    setErrors((previous) => ({ ...previous, [field.key]: '' }))
    try {
      const url = await uploadIndividualKycRfiDocument(file)
      setAnswers((previous) => {
        const existing = previous[field.key]
        const urls = Array.isArray(existing) && field.multiple ? existing : []
        return { ...previous, [field.key]: [...urls, url] }
      })
      setFileNames((previous) => ({
        ...previous,
        [field.key]: field.multiple ? [...(previous[field.key] ?? []), file.name] : [file.name],
      }))
    } catch (error) {
      setErrors((previous) => ({
        ...previous,
        [field.key]: kycErrorMessage(error, 'Não foi possível enviar o arquivo.'),
      }))
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!rfi) return
    const nextErrors: Record<string, string> = {}
    const responses: Record<string, RfiAnswer> = {}
    for (const field of rfi.sections.flatMap((section) => section.fields)) {
      const answer = answers[field.key]
      const empty =
        answer === undefined || (Array.isArray(answer) ? !answer.length : !answer.trim())
      if (empty) {
        if (field.required) nextErrors[field.key] = 'Campo obrigatório.'
        continue
      }
      responses[field.key] = typeof answer === 'string' ? answer.trim() : answer
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length || !Object.keys(responses).length) return
    setBusy(true)
    setNotice('')
    try {
      onSubmitted(await submitIndividualKycRfi(responses))
    } catch (error) {
      setNotice(
        kycErrorMessage(error, 'A BlindPay não aceitou a resposta. Revise e tente novamente.'),
      )
    } finally {
      setBusy(false)
    }
  }

  if (loadError) {
    return (
      <p role="alert" className="text-sm text-red-700">
        {loadError}
      </p>
    )
  }
  if (!rfi) {
    return (
      <p role="status" className="text-sm text-slate-600">
        Carregando o pedido de informações...
      </p>
    )
  }
  if (!rfi.open) {
    return (
      <p role="status" className="text-sm text-slate-600">
        Não há pedido de informações em aberto. Atualize a situação em instantes.
      </p>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6 text-left">
      <h3 className="text-base font-semibold text-slate-900">
        Informações solicitadas pela BlindPay
      </h3>
      {rfi.expiresAt && (
        <p className="text-xs text-slate-600">
          Responda até {new Date(rfi.expiresAt).toLocaleDateString('pt-BR')}. A resposta é enviada
          uma única vez.
        </p>
      )}
      {rfi.sections.map((section, index) => (
        <fieldset
          key={section.title ?? index}
          className="space-y-4 rounded-lg border border-sage-300 p-4"
        >
          {section.title && (
            <legend className="px-1 text-sm font-semibold text-slate-900">{section.title}</legend>
          )}
          {section.description && <p className="text-sm text-slate-600">{section.description}</p>}
          {section.fields.map((field) => {
            const id = `rfi-${field.key}`
            const label = `${field.label ?? field.key}${field.required ? ' *' : ''}`
            const error = errors[field.key]
            const describedBy = error ? `${id}-error` : undefined
            return (
              <div key={field.key} className="space-y-2">
                <label htmlFor={id} className="block text-sm font-medium text-sage-800">
                  {label}
                </label>
                {isDocumentField(field) ? (
                  <>
                    <input
                      id={id}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      disabled={busy}
                      aria-invalid={Boolean(error)}
                      aria-describedby={describedBy}
                      onChange={(event) => {
                        void addFile(field, event.target.files?.item(0) ?? null)
                        event.target.value = ''
                      }}
                      className="block w-full text-sm text-slate-700"
                    />
                    {fileNames[field.key]?.length ? (
                      <p className="break-all text-xs text-slate-700">
                        Enviado: {fileNames[field.key].join(', ')}
                      </p>
                    ) : null}
                  </>
                ) : field.options.length ? (
                  <select
                    id={id}
                    value={
                      typeof answers[field.key] === 'string' ? (answers[field.key] as string) : ''
                    }
                    onChange={(event) =>
                      setAnswers((previous) => ({ ...previous, [field.key]: event.target.value }))
                    }
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy}
                    className={fieldClasses}
                  >
                    <option value="">Selecione</option>
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label ?? option.value}
                      </option>
                    ))}
                  </select>
                ) : (
                  <textarea
                    id={id}
                    rows={3}
                    maxLength={4096}
                    value={
                      typeof answers[field.key] === 'string' ? (answers[field.key] as string) : ''
                    }
                    onChange={(event) =>
                      setAnswers((previous) => ({ ...previous, [field.key]: event.target.value }))
                    }
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy}
                    className={fieldClasses}
                  />
                )}
                {error && (
                  <p id={describedBy} role="alert" className="text-sm text-red-700">
                    {error}
                  </p>
                )}
              </div>
            )
          })}
        </fieldset>
      ))}
      {notice && (
        <p role="alert" className="text-sm text-red-700">
          {notice}
        </p>
      )}
      <Button type="submit" label={busy ? 'Enviando...' : 'Enviar informações'} disabled={busy} />
    </form>
  )
}
