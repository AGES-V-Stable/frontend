import type { PaginationProps } from './types'
import { Button } from '@/components/Button'

export function TablePagination({
  currentPage,
  totalPages,
  itemsPerPage,
  totalRecords,
  onPageChange,
}: PaginationProps) {
  const handlePrev = () => {
    onPageChange(currentPage - 1)
  }

  const handleNext = () => {
    onPageChange(currentPage + 1)
  }

  const startRecord = (currentPage - 1) * itemsPerPage + 1
  const endRecord = Math.min(currentPage * itemsPerPage, totalRecords)

  return (
    <div className="w-full flex items-center justify-between py-6">
      <div className="font-['IBM_Plex_Sans'] text-[14px] text-[#64748B]">
        Mostrando {startRecord}-{endRecord} de {totalRecords} clientes
      </div>
      
      <div className="flex items-center gap-[8px]">
        <Button
          label="Anterior"
          variant="secondary"
          disabled={currentPage === 1}
          onClick={handlePrev}
          className="!w-[112px] !h-[40px] !px-[24px] !rounded-[8px] !border-[#059669] !text-[#059669] hover:!text-white !border"
        />
        <div className="w-[72px] h-[40px] flex items-center justify-center rounded-[8px] bg-[var(--Neutral-Grey-Surface,#F8F9FB)] font-['IBM_Plex_Sans'] text-[14px] font-medium text-[#0F172A]">
          {currentPage} de {totalPages}
        </div>
        <Button
          label="Próxima"
          variant="secondary"
          disabled={currentPage === totalPages}
          onClick={handleNext}
          className="!w-[112px] !h-[40px] !px-[24px] !rounded-[8px] !border-[#059669] !text-[#059669] hover:!text-white !border"
        />
      </div>
    </div>
  )
}
