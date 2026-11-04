import { useId } from 'react'
import type { SelectHTMLAttributes } from 'react'

export interface SelectOption {
  value: string
  label: string
}

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> & {
  label?: string
  value: string
  options: SelectOption[]
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  error?: string
}

/** Lista de opções com o mesmo visual e acessibilidade do Input. */
function Select({ label, error, id, options, className = '', ...selectProps }: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = error ? `${selectId}-error` : undefined

  return (
    <div className="flex flex-col gap-y-1 w-full">
      {label && (
        <label htmlFor={selectId} className="text-[14px] text-sage-800">
          {label}
        </label>
      )}
      <select
        {...selectProps}
        id={selectId}
        aria-invalid={!!error}
        aria-describedby={errorId}
        className={`w-full py-3.5 px-3 text-[16px] border rounded-lg bg-surface text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-red-700' : 'border-sage-300'} ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export { Select }
