import { useId } from 'react'
import type { InputType } from './InputType'

function Input({ label, error, id, prefix, className = '', style, ...inputProps }: InputType) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined

  const field = (
    <input
      type="text"
      {...inputProps}
      id={inputId}
      aria-invalid={!!error}
      aria-describedby={errorId}
      style={prefix ? { paddingLeft: `calc(1.25rem + ${prefix.length}ch)`, ...style } : style}
      className={`w-full py-3.5 px-3 text-[16px] placeholder:text-gray-500 border rounded-lg bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${error ? 'border-red-700' : 'border-sage-300'} ${className}`}
    />
  )

  return (
    <div className="flex flex-col gap-y-1 w-full">
      {label && (
        <label htmlFor={inputId} className="text-[14px] text-sage-800">
          {label}
        </label>
      )}
      {prefix ? (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-primary">
            {prefix}
          </span>
          {field}
        </div>
      ) : (
        field
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export { Input }
