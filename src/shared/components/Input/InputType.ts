import type { InputHTMLAttributes } from 'react'

export type InputType = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  label?: string
  /** `inside` mostra o rótulo dentro do campo, à esquerda do valor (filtros compactos). */
  labelPlacement?: 'top' | 'inside'
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  /** Destaca o campo como inválido sem renderizar uma mensagem de erro abaixo dele. */
  invalid?: boolean
  /** Texto fixo exibido dentro do campo, à esquerda do valor (ex.: símbolo da moeda). */
  prefix?: string
}
