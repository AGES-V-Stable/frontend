import type { ReactNode } from 'react'
import type { StatusVariant } from '@/shared/components/Table/StatusBadge'

export type ColumnAlign = 'left' | 'center' | 'right'
export type CellType = 'text' | 'status' | 'action'

export interface ColumnDefinition<T> {
  key: string // The property key of the row data, or a unique identifier
  label: string // Table header label
  type?: CellType // Defines the render style/component
  width?: number | string // Optional specific width
  align?: ColumnAlign
  // Fallback for custom rendering if needed in the future
  render?: (item: T) => ReactNode
  // Cor do badge em colunas 'status'; sem ela, a cor é inferida do texto e o padrão é neutro
  statusVariant?: (item: T) => StatusVariant
}

export interface TableAction<T> {
  label: string
  onClick: (item: T) => void
  // Could add icons or variants here later
}

export interface PaginationProps {
  compact?: boolean
  currentPage: number
  totalPages: number
  displayedRecords: number
  itemsPerPage: number
  totalRecords: number
  onPageChange: (page: number) => void
  entityLabel?: string
}

export interface TableProps<T> {
  compact?: boolean
  title?: string
  totalRecords?: number // Total number of records (used in header if provided)
  /** Linha de apoio sob o título; quando informada, a contagem aparece nela. */
  subtitle?: string
  /** Conteúdo exibido dentro do cartão, abaixo das linhas (por exemplo, um estado inicial). */
  footer?: ReactNode
  columns: ColumnDefinition<T>[]
  data: T[]

  // Actions configuration
  actions?: TableAction<T>[]

  // Pagination configuration
  pagination?: PaginationProps

  // Message to display when data is empty
  emptyMessage?: ReactNode
  entityLabel?: string

  // Identifica a linha no nome acessível das ações (ex.: "Ver detalhes: Tech Corp")
  rowLabel?: (item: T) => string
}
