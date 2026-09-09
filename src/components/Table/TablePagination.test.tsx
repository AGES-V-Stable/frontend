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
      />,
    )

    expect(screen.getByText('2 de 5')).toBeInTheDocument()

    const prevButton = screen.getByText('Anterior')
    const nextButton = screen.getByText('Próxima')

    fireEvent.click(prevButton)
    expect(onPageChange).toHaveBeenCalledWith(1)

    fireEvent.click(nextButton)
    expect(onPageChange).toHaveBeenCalledWith(3)
  })
  it('should disable navigation and show a valid range when there are no records', () => {
    const onPageChange = vi.fn()

    render(
      <TablePagination
        currentPage={1}
        totalPages={0}
        displayedRecords={0}
        itemsPerPage={10}
        totalRecords={0}
        onPageChange={onPageChange}
      />,
    )

    const prevButton = screen.getByRole('button', { name: 'Anterior' })
    const nextButton = screen.getByRole('button', { name: 'Próxima' })

    expect(screen.getByText('Mostrando 0-0 de 0 clientes')).toBeInTheDocument()
    expect(prevButton).toBeDisabled()
    expect(nextButton).toBeDisabled()

    fireEvent.click(prevButton)
    fireEvent.click(nextButton)
    expect(onPageChange).not.toHaveBeenCalled()
  })
})
