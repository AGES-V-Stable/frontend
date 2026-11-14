import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Table } from '@/shared/components/Table/Table'

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

  it('names each row action with the row it belongs to', () => {
    // Given duas linhas com a mesma ação visível
    render(
      <Table<Row>
        columns={[
          { key: 'name', label: 'Nome' },
          { key: 'action', label: 'Ação', type: 'action' },
        ]}
        data={[
          { id: '1', name: 'Tech Corp' },
          { id: '2', name: 'Agro Sul' },
        ]}
        actions={[{ label: 'Ver detalhes', onClick: vi.fn() }]}
        rowLabel={(row) => row.name}
      />,
    )

    // Then o leitor de tela distingue as linhas, e o texto visível continua igual
    expect(screen.getByRole('button', { name: 'Ver detalhes: Tech Corp' })).toHaveTextContent(
      'Ver detalhes',
    )
    expect(screen.getByRole('button', { name: 'Ver detalhes: Agro Sul' })).toBeInTheDocument()
  })

  it('announces the visible range when the page changes', () => {
    const pagination = {
      currentPage: 1,
      totalPages: 3,
      displayedRecords: 4,
      itemsPerPage: 4,
      totalRecords: 10,
      onPageChange: vi.fn(),
    }
    const rows = [{ id: '1', name: 'Tech Corp' }]
    const { rerender } = render(
      <Table<Row>
        entityLabel="clientes"
        columns={[{ key: 'name', label: 'Nome' }]}
        data={rows}
        pagination={pagination}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 1-4 de 10 clientes')

    // When a lista vai para a página 2
    rerender(
      <Table<Row>
        entityLabel="clientes"
        columns={[{ key: 'name', label: 'Nome' }]}
        data={rows}
        pagination={{ ...pagination, currentPage: 2 }}
      />,
    )

    // Then a região de status anuncia o novo intervalo
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 5-8 de 10 clientes')
  })

  it('exposes the table title as a level-2 heading', () => {
    render(
      <Table<Row> title="Todos os clientes" columns={[{ key: 'name', label: 'Nome' }]} data={[]} />,
    )

    expect(screen.getByRole('heading', { level: 2, name: /Todos os clientes/ })).toBeInTheDocument()
  })
})
