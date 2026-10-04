import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AdminNavIcon, Sidebar, type AdminNavIconId } from '@/components/Sidebar'
import { PATHS } from '@/routes/paths'
import { BeneficiaryList } from '@/components/BeneficiaryList'

const sidebarMenuItems = [
  { id: 'home', label: 'Início', path: PATHS.HOME },
  { id: 'beneficiaries', label: 'Beneficiários', path: PATHS.ADMIN_BENEFICIARIES },
  { id: 'transfers', label: 'Transferências', path: '/transfers' },
  { id: 'settings', label: 'Configurações', path: '/settings' },
].map((item) => ({ ...item, icon: <AdminNavIcon id={item.id as AdminNavIconId} /> }))

function BeneficiaryView() {
  const navigate = useNavigate()
  const location = useLocation()

  const activeItemId = useMemo(
    () => sidebarMenuItems.find((item) => item.path === location.pathname)?.id ?? 'beneficiaries',
    [location.pathname],
  )

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar
        className="sticky top-0"
        logo={
          <span className="sidebar__brand">
            V-<span className="sidebar__brand-accent">Stable</span>
          </span>
        }
        items={sidebarMenuItems.map((item) => ({ ...item, onClick: () => navigate(item.path) }))}
        activeItemId={activeItemId}
        account={{ name: 'V-Stable Admin', description: 'Operações & Compliance', initials: 'CA' }}
      />
      <main className="min-h-screen w-full px-6 py-8 lg:px-10">
        <BeneficiaryList
          title="Beneficiários"
          subtitle="Consulta global de beneficiários cadastrados na plataforma."
        />
      </main>
    </div>
  )
}

export default BeneficiaryView