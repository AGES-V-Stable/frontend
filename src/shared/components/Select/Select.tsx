import { useId } from 'react'
import type { SelectHTMLAttributes } from 'react'

export interface SelectOption {
  value: string
  label: string
}

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> & {
  label?: string
  /** `inside` mostra o rótulo dentro do campo, à esquerda do valor (filtros compactos). */
  labelPlacement?: 'top' | 'inside'
  value: string
  options: SelectOption[]
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  error?: string
}

/** Lista de opções com o mesmo visual e acessibilidade do Input. */
function Select({
  label,
  labelPlacement = 'top',
  error,
  id,
  options,
  className = '',
  style,
  ...selectProps
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = error ? `${selectId}-error` : undefined
  const inside = labelPlacement === 'inside' && !!label

  const field = (
    <select
      {...selectProps}
      id={selectId}
      aria-invalid={!!error}
      aria-describedby={errorId}
      style={inside ? { paddingLeft: `calc(1.25rem + ${label?.length ?? 0}ch)`, ...style } : style}
      className={`w-full border rounded-lg bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${inside ? 'py-2.5 pr-3 text-[14px] font-medium text-slate-700' : 'py-3.5 px-3 text-[16px] text-slate-900'} ${error ? 'border-red-700' : 'border-sage-300'} ${className}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )

  return (
    <div className="flex flex-col gap-y-1 w-full">
      {label && !inside && (
        <label htmlFor={selectId} className="text-[14px] text-sage-800">
          {label}
        </label>
      )}
      {inside ? (
        <div className="relative">
          <label
            htmlFor={selectId}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-500"
          >
            {label}
          </label>
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

export { Select }
