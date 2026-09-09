import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/Button'
import { Table } from '@/components/Table'
import { mockClients as mockData } from '@/data/mockClients'
import { clientTableColumns as columns } from '@/config/clientTableColumns'
import { Sidebar } from '@/components/Sidebar'
import { PATHS } from '@/routes/paths'
import { sidebarItems } from './sidebarItems'

const noop = () => {}

function Home() {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1)
  const [activeItemId, setActiveItemId] = useState('home')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        className="sticky top-0"
        logo={
          <span className="sidebar__brand">
            V-<span className="sidebar__brand-accent">Stable</span>
          </span>
        }
        items={sidebarItems.map((item) => ({ ...item, onClick: () => setActiveItemId(item.id) }))}
        activeItemId={activeItemId}
        account={{ name: 'V-Stable Admin', description: 'Operações & Compliance', initials: 'CA' }}
      />
      <main className="flex min-w-0 flex-1 flex-col gap-8 overflow-x-auto p-8">
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

        <div className="flex flex-col gap-3 max-w-xs mt-12 border-t pt-8">
          <h2 className="text-2xl font-bold mb-4">Navegação</h2>
          <Button label="Ir para Login" variant="primary" onClick={() => navigate(PATHS.LOGIN)} />
          <Button
            label="Ir para Cadastro"
            variant="secondary"
            onClick={() => navigate(PATHS.REGISTER)}
          />
          <Button
            label="Ir para Clientes PME"
            variant="tertiary"
            onClick={() => navigate(PATHS.ADMIN_CLIENTS)}
          />
        </div>
      </main>
    </div>
  )
}

export { Home }
