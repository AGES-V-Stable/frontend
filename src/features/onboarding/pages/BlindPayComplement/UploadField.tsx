import type { ChangeEvent, DragEvent } from 'react'
import { isImageOnly } from './validation'
import type { UploadKind } from './validation'

interface UploadFieldProps {
  id: string
  title: string
  /** Nome acessível do input de arquivo (visualmente oculto). */
  inputLabel: string
  description: string
  kind: UploadKind
  file: File | null
  error?: string
  disabled?: boolean
  onSelect: (file: File | null) => void
}

export function UploadField({
  id,
  title,
  inputLabel,
  description,
  kind,
  file,
  error,
  disabled = false,
  onSelect,
}: UploadFieldProps) {
  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    if (!disabled) onSelect(event.dataTransfer.files.item(0))
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    onSelect(event.target.files?.item(0) ?? null)
    event.target.value = ''
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-sage-800">{title} *</p>
      <label
        htmlFor={id}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className={
          'flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-surface px-4 py-6 text-center transition-colors hover:border-primary ' +
          (error ? 'border-red-700' : 'border-sage-300')
        }
      >
        <span className="text-sm font-medium text-primary">
          {file ? 'Substituir arquivo' : 'Selecionar arquivo ou arrastar aqui'}
        </span>
        <span className="text-xs text-slate-600">{description}</span>
        {file && <span className="max-w-full break-all text-sm text-slate-900">{file.name}</span>}
      </label>
      <input
        id={id}
        className="sr-only"
        type="file"
        aria-label={inputLabel}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? id + '-error' : undefined}
        accept={isImageOnly(kind) ? '.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png'}
        disabled={disabled}
        onChange={onChange}
      />
      {error && (
        <p id={id + '-error'} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
