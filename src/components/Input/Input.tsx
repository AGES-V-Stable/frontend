import { useId } from 'react'
import type { InputType } from './InputType'

function Input({ label, error, id, className = '', ...inputProps }: InputType) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className="flex flex-col gap-y-1 w-full">
      {label && (
        <label htmlFor={inputId} className="text-sm text-sage-800">
          {label}
        </label>
      )}
      <input
        type="text"
        {...inputProps}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={errorId}
        className={`w-full py-3.5 px-3 text-base placeholder:text-gray-500 border rounded-lg bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${error ? 'border-red-700' : 'border-sage-300'} ${className}`}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export { Input }
