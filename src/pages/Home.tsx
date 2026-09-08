import { useState } from 'react'
import { Button } from '@/components/Button'
import { Table } from '@/components/Table'
import { mockClients as mockData } from '@/data/mockClients'
import { clientTableColumns as columns } from '@/config/clientTableColumns'

const noop = () => {}

function Home() {
  const [currentPage, setCurrentPage] = useState(1)

  return (
    <div className="p-8 flex flex-col gap-8 w-full bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold mb-4">V-Stable</h1>

        {/* Table Example */}
        <div className="w-full">
          <Table
            title="Todos os clientes"
            totalRecords={24}
            columns={columns}
            data={mockData}
            actions={[{ label: 'Ver detalhes', onClick: noop }]}
            pagination={{
              currentPage,
              totalPages: 6,
              displayedRecords: mockData.length,
              itemsPerPage: 4,
              totalRecords: 24,
              onPageChange: setCurrentPage,
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-8 max-w-md mt-12 border-t pt-8">
        <h1 className="text-2xl font-bold mb-4">Button Components</h1>
        <div className="w-full flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-600">Primary Button</h2>
          <Button label="Continuar" variant="primary" onClick={noop} />
        </div>

        <div className="w-full flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-600">Secondary Button</h2>
          <Button label="Voltar" variant="secondary" onClick={noop} />
        </div>

        <div className="w-full flex flex-col gap-2 items-center">
          <h2 className="text-sm font-semibold text-gray-600 self-start">Tertiary Button</h2>
          <Button label="Esqueci minha senha" variant="tertiary" onClick={noop} />
        </div>

        <div className="w-full flex flex-col gap-4 mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-600">Disabled States</h2>
          <Button label="Primário Desabilitado" variant="primary" disabled />
          <Button label="Secundário Desabilitado" variant="secondary" disabled />
          <Button label="Terciário Desabilitado" variant="tertiary" disabled />
        </div>
      </div>
    </div>
  )
}

export default Home