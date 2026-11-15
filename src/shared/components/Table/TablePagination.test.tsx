import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { TablePagination } from '@/shared/components/Table/TablePagination'

describe('TablePagination', () => {
  it('should render and handle clicks', async () => {
    const user = userEvent.setup()
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

    await user.click(prevButton)
    expect(onPageChange).toHaveBeenCalledWith(1)

    await user.click(nextButton)
    expect(onPageChange).toHaveBeenCalledWith(3)
  })
  it('should disable navigation and show a valid range when there are no records', async () => {
    const user = userEvent.setup()
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

    expect(screen.getByText('Mostrando 0-0 de 0 registros')).toBeInTheDocument()
    expect(prevButton).toBeDisabled()
    expect(nextButton).toBeDisabled()

    await user.click(prevButton)
    await user.click(nextButton)
    expect(onPageChange).not.toHaveBeenCalled()
  })

  function StatefulPagination({ initialPage }: { initialPage: number }) {
    const [page, setPage] = useState(initialPage)
    return (
      <TablePagination
        currentPage={page}
        totalPages={3}
        displayedRecords={4}
        itemsPerPage={4}
        totalRecords={10}
        onPageChange={setPage}
      />
    )
  }

  it('moves the focus to "Anterior" when "Próxima" reaches the last page', async () => {
    // Given o teclado no "Próxima", uma página antes da última
    const user = userEvent.setup()
    render(<StatefulPagination initialPage={2} />)
    screen.getByRole('button', { name: 'Próxima' }).focus()

    // When o usuário avança para a última página
    await user.keyboard('{Enter}')

    // Then o "Próxima" fica desabilitado e o foco não se perde
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Anterior' })).toHaveFocus()
  })

  it('moves the focus to "Próxima" when "Anterior" reaches the first page', async () => {
    const user = userEvent.setup()
    render(<StatefulPagination initialPage={2} />)
    screen.getByRole('button', { name: 'Anterior' }).focus()

    await user.keyboard('{Enter}')

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Próxima' })).toHaveFocus()
  })
})
