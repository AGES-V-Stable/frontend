import type { ReactNode } from 'react'

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
}

export interface TableAction<T> {
  label: string
  onClick: (item: T) => void
  // Could add icons or variants here later
}

export interface TableProps<T> {
  title?: string
  totalRecords?: number // Total number of records (used in header if provided)
  columns: ColumnDefinition<T>[]
  data: T[]

  // Actions configuration
  actions?: TableAction<T>[]
}
