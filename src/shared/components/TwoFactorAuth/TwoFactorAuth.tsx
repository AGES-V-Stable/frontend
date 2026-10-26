import { useId } from 'react'

export interface TwoFactorAuthProps {
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
  id?: string
  label?: string
  description?: string
  className?: string
  onVerify?: (code: string) => void
}

export function TwoFactorAuth({
  value,
  onChange,
  error,
  disabled = false,
  id,
  label = 'Código de autenticação',
  description = 'Insira o código de 6 dígitos gerado pelo seu aplicativo autenticador.',
  className = '',
  onVerify,
}: TwoFactorAuthProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined
  const descriptionId = `${inputId}-description`

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 6)
    onChange(digitsOnly)
    if (digitsOnly.length === 6 && onVerify) {
      onVerify(digitsOnly)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && value.length === 6 && onVerify) {
      event.preventDefault()
      onVerify(value)
    }
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-[14px] font-medium text-slate-900">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-xs text-slate-500">
            {description}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="one-time-code"
          disabled={disabled}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="000000"
          aria-invalid={!!error}
          aria-describedby={error ? `${descriptionId} ${errorId}` : descriptionId}
          className={`h-12 w-full max-w-[280px] rounded-lg border bg-surface px-4 text-center font-mono text-xl tracking-[0.3em] placeholder:tracking-normal placeholder:text-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            error ? 'border-red-700' : 'border-sage-300'
          }`}
        />
        {error && (
          <p id={errorId} role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

// Alias para consistência com o nome TwoFactorAuthContainer caso seja importado assim
export const TwoFactorAuthContainer = TwoFactorAuth
