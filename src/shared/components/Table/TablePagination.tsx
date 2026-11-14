import { useRef } from 'react'
import type { PaginationProps } from '@/shared/components/Table/types'
import { Button } from '@/shared/components/Button'
import { getRecordRange } from '@/shared/components/Table/recordRange'

export function TablePagination({
  compact = false,
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

  const prevRef = useRef<HTMLButtonElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  // O botão usado fica desabilitado no limite da lista; o foco passa para o outro antes disso.
  const handlePrev = () => {
    if (!hasPreviousPage) return
    if (currentPage - 1 === 1 && document.activeElement === prevRef.current)
      nextRef.current?.focus()
    onPageChange(currentPage - 1)
  }

  const handleNext = () => {
    if (!hasNextPage) return
    if (currentPage + 1 === totalPages && document.activeElement === nextRef.current)
      prevRef.current?.focus()
    onPageChange(currentPage + 1)
  }

  const { start: startRecord, end: endRecord } = getRecordRange({
    currentPage,
    itemsPerPage,
    displayedRecords,
    totalRecords,
  })

  return (
    <div
      className={`w-full flex items-center justify-between py-6 ${compact ? 'flex-wrap gap-4' : ''}`}
    >
      <div className="font-['IBM_Plex_Sans'] text-[14px] text-slate-500">
        Mostrando {startRecord}-{endRecord} de {totalRecords} {entityLabel}
      </div>

      <div className={`flex items-center gap-[8px] ${compact ? 'flex-wrap' : ''}`}>
        <Button
          ref={prevRef}
          label="Anterior"
          variant="secondary"
          disabled={!hasPreviousPage}
          onClick={handlePrev}
          className="!w-[112px] !h-[40px] !px-[24px] !rounded-[8px] !border-primary !text-primary hover:!text-white !border"
        />
        <div className="w-[72px] h-[40px] flex items-center justify-center rounded-[8px] bg-surface font-['IBM_Plex_Sans'] text-[14px] font-medium text-slate-900">
          {currentPage} de {totalPages}
        </div>
        <Button
          ref={nextRef}
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
