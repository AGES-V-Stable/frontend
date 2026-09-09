import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/Button'
import { Sidebar } from '@/components/Sidebar'
import { PATHS } from '@/routes/paths'
import { sidebarItems } from './sidebarItems'

function Home() {
  const navigate = useNavigate()
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
        <h1 className="text-2xl font-bold mb-4">V-Stable</h1>

        <div className="flex flex-col gap-3 max-w-xs">
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
