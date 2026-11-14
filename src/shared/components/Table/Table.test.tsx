import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Table } from '@/shared/components/Table/Table'

interface Row {
  id: string
  name: string
}

describe('Table', () => {
  it('given a subtitle and a footer, then the count joins the subtitle and the footer stays inside the card', () => {
    render(
      <Table<Row>
        title="Pessoas com acesso"
        subtitle="Gestão exclusiva do proprietário"
        totalRecords={1}
        entityLabel="membro"
        columns={[{ key: 'name', label: 'Nome' }]}
        data={[{ id: '1', name: 'Marina' }]}
        footer={<p>Sua equipe começa aqui</p>}
      />,
    )

    expect(screen.getByText('1 membro · Gestão exclusiva do proprietário')).toBeInTheDocument()
    expect(screen.queryByText('· 1 membro')).not.toBeInTheDocument()
    expect(screen.getByText('Sua equipe começa aqui')).toBeInTheDocument()
  })

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
