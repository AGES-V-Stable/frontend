import type { PaginationProps } from '@/shared/components/Table/types'

type RecordRangeInput = Pick<
  PaginationProps,
  'currentPage' | 'itemsPerPage' | 'displayedRecords' | 'totalRecords'
>

/** Primeiro e último registro exibidos na página atual (base 1). */
export function getRecordRange({
  currentPage,
  itemsPerPage,
  displayedRecords,
  totalRecords,
}: RecordRangeInput) {
  const start = totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const end = totalRecords === 0 ? 0 : Math.min(start + displayedRecords - 1, totalRecords)
  return { start, end }
}
