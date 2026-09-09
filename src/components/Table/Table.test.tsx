import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Table } from './Table'

interface Row {
  id: string
  name: string
}

describe('Table', () => {
  it('should show the empty message and hide pagination when there are no records', () => {
    render(
      <Table<Row>
        title="Clientes"
        totalRecords={0}
        columns={[{ key: 'name', label: 'Nome' }]}
        data={[]}
        emptyMessage="Não há clientes para listar."
        pagination={{
          currentPage: 1,
          totalPages: 0,
          displayedRecords: 0,
          itemsPerPage: 10,
          totalRecords: 0,
          onPageChange: vi.fn(),
        }}
      />,
    )

    expect(screen.getByText('Não há clientes para listar.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Anterior' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Próxima' })).not.toBeInTheDocument()
  })
})
