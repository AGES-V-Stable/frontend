import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TablePagination } from './TablePagination'

describe('TablePagination', () => {
  it('should render and handle clicks', () => {
    const onPageChange = vi.fn()
    render(
      <TablePagination
        currentPage={2}
        totalPages={5}
        displayedRecords={10}
        itemsPerPage={10}
        totalRecords={48}
        onPageChange={onPageChange}
      />
    )

    expect(screen.getByText('2 de 5')).toBeInTheDocument()

    const prevButton = screen.getByText('Anterior')
    const nextButton = screen.getByText('Próxima')

    fireEvent.click(prevButton)
    expect(onPageChange).toHaveBeenCalledWith(1)

    fireEvent.click(nextButton)
    expect(onPageChange).toHaveBeenCalledWith(3)
  })
})
