import type { PaginationProps } from './types'
import { Button } from '@/components/Button'

export function TablePagination({
  currentPage,
  totalPages,
  displayedRecords,
  itemsPerPage,
  totalRecords,
  onPageChange,
  entityLabel = 'registros',
}: PaginationProps) {
  const hasPreviousPage = currentPage > 1
  const hasNextPage = currentPage < totalPages

  const handlePrev = () => {
    if (hasPreviousPage) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (hasNextPage) {
      onPageChange(currentPage + 1)
    }
  }

  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endRecord =
    totalRecords === 0 ? 0 : Math.min(startRecord + displayedRecords - 1, totalRecords)

  return (
    <div className="w-full flex items-center justify-between py-6">
      <div className="font-['IBM_Plex_Sans'] text-sm text-slate-500">
        Mostrando {startRecord}-{endRecord} de {totalRecords} {entityLabel}
      </div>

      <div className="flex items-center gap-[8px]">
        <Button
          label="Anterior"
          variant="secondary"
          disabled={!hasPreviousPage}
          onClick={handlePrev}
          className="!w-[112px] !h-[40px] !px-[24px] !rounded-[8px] !border-primary !text-primary hover:!text-white !border"
        />
        <div className="w-[72px] h-[40px] flex items-center justify-center rounded-[8px] bg-surface font-['IBM_Plex_Sans'] text-sm font-medium text-slate-900">
          {currentPage} de {totalPages}
        </div>
        <Button
          label="Próxima"
          variant="secondary"
          disabled={!hasNextPage}
          onClick={handleNext}
          className="!w-[112px] !h-[40px] !px-[24px] !rounded-[8px] !border-primary !text-primary hover:!text-white !border"
        />
      </div>
    </div>
  )
}
