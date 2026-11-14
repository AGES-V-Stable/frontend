import { lazy, Suspense, useState } from 'react'
import {
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router'
import { SupportChatWidget } from '@/features/support'
import {
  AdminSecurityRequests,
  clearLoginToken,
  isStoredAdmin,
  Settings,
  useSession,
} from '@/features/auth'
import { Login } from '@/features/auth/pages/Login'
import { CompanyInvitation } from '@/features/invitations'
import AdminClients from '@/features/clients/pages/AdminClients'
import AdminTransfers from '@/features/transfers/pages/AdminTransfers'
import { BeneficiaryView } from '@/features/beneficiaries/pages/admin/beneficiaryView'
import { BeneficiariesLanding } from '@/features/beneficiaries/pages/client/beneficiaries/BeneficiariesLanding'
import { BeneficiaryCreate } from '@/features/beneficiaries/pages/client/beneficiaryCreate'
import { TransferCreate } from '@/features/transfers/pages/client/transferCreate'
import { TransferDetails } from '@/features/transfers/pages/client/transferDetails'
import { Members } from '@/features/members/pages/Members'
import { Register } from '@/features/onboarding/pages/Register'
import { RegisterStatus } from '@/features/onboarding/pages/RegisterStatus/RegisterStatus'
import RegistrationComplete from '@/features/onboarding/pages/Register/RegistrationComplete'
import {
  CompanyRoute,
  CompanySetupRoute,
  RepresentativeRoute,
  TwoFactorRoute,
  ComplianceRoute,
  LivenessRoute,
} from '@/features/onboarding/pages/WizardRoutes'
import { PATHS, transferDetailsPath } from '@/shared/navigation/paths'
import { maskCNPJ } from '@/shared/utils/masks'
import { postLoginDestination } from './postLoginDestination'
import { ApplicationShell } from './components/ApplicationShell'
import { NavBar } from './components/NavBar'
import type { NavigationItem } from './components/NavBar'
import logo from '@/shared/assets/navigation/logo.png'
import homeIcon from '@/shared/assets/navigation/home.svg'
import beneficiariesIcon from '@/shared/assets/navigation/beneficiaries.svg'
import clientsIcon from '@/shared/assets/navigation/clients.svg'
import transfersIcon from '@/shared/assets/navigation/transfers.svg'
import settingsIcon from '@/shared/assets/navigation/settings.svg'
import supportIcon from '@/shared/assets/navigation/support.svg'
import logoutIcon from '@/shared/assets/navigation/logout.svg'

function SessionState() {
  const { status, retry } = useSession()
  return status === 'error' ? (
    <div className="p-8">
      <p role="alert">Não foi possível carregar os dados da conta.</p>
      <button type="button" onClick={retry}>
        Tentar novamente
      </button>
    </div>
  ) : (
    <p role="status" className="p-8">
      Carregando dados da conta...
    </p>
  )
}
function RoleLanding() {
  const { status } = useSession()
  if (status === 'loading' || status === 'error') return <SessionState />
  return (
    <Navigate
      replace
      to={
        status === 'anonymous'
          ? PATHS.LOGIN
          : isStoredAdmin()
            ? PATHS.ADMIN_DASHBOARD
            : PATHS.DASHBOARD
      }
    />
  )
}
function RoleGuard({ role }: { role?: 'ADMIN' | 'USER' }) {
  const { status, user } = useSession()
  const { pathname, search } = useLocation()
  if (status === 'loading' || status === 'error') return <SessionState />
  if (status === 'anonymous')
    return <Navigate to={PATHS.LOGIN} replace state={{ from: pathname + search }} />
  if (role && (isStoredAdmin() ? 'ADMIN' : 'USER') !== role) return <RoleLanding />
  if (role === 'USER' && !user?.companyId) {
    // Vínculo removido: a conta segue autenticável e só consulta o próprio acesso.
    const removed = user?.companyAccess?.status === 'REMOVED'
    if (removed && pathname === PATHS.MEMBERS) return <Outlet />
    return (
      <div className="flex flex-col items-start gap-3 p-8">
        <p role="alert">
          {removed
            ? 'Seu acesso à empresa foi removido.'
            : 'Esta conta não possui vínculo empresarial.'}
        </p>
        <p className="text-sm text-slate-600">
          Cadastre a sua empresa para começar, ou peça um convite ao gestor de uma empresa já
          cadastrada.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to={PATHS.COMPANY_SETUP}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Cadastrar empresa
          </Link>
          {removed && (
            <Link
              to={PATHS.MEMBERS}
              className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary"
            >
              Ver meu acesso
            </Link>
          )}
        </div>
      </div>
    )
  }
  return <Outlet />
}
function LegacyRedirect({ to, details = false }: { to?: string; details?: boolean }) {
  const { id } = useParams()
  const { search, hash } = useLocation()
  return <Navigate replace to={`${details ? transferDetailsPath(id ?? '') : to}${search}${hash}`} />
}
function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Sole owner of menu content, role selection, active state, destinations and shell composition. */
function RoutedApplication() {
  const { user, company } = useSession()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [supportChatOpen, setSupportChatOpen] = useState(false)
  const admin = isStoredAdmin()
  const icon = (src: string) => <img src={src} alt="" />
  const item = (id: string, label: string, path: string, src: string): NavigationItem => ({
    id,
    label,
    icon: icon(src),
    onClick: () => {
      void navigate(path)
    },
  })
  const items: NavigationItem[] = admin
    ? [
        item('dashboard', 'Dashboard', PATHS.ADMIN_DASHBOARD, homeIcon),
        item('clients', 'Clientes PME', PATHS.ADMIN_CLIENTS, clientsIcon),
        item('security-requests', 'Solicitações de Segurança', PATHS.ADMIN_SECURITY, supportIcon),
        {
          id: 'audit',
          label: 'Auditoria',
          icon: icon(transfersIcon),
          children: [
            item('admin-transfers', 'Transferências', PATHS.ADMIN_TRANSFERS, transfersIcon),
            item(
              'admin-beneficiaries',
              'Beneficiários',
              PATHS.ADMIN_BENEFICIARIES,
              beneficiariesIcon,
            ),
          ],
        },
      ]
    : user?.companyAccess?.status === 'REMOVED' && !user.companyId
      ? // Sem empresa após a remoção: resta apenas a consulta do próprio acesso.
        [item('members', 'Membros', PATHS.MEMBERS, clientsIcon)]
      : [
          item('dashboard', 'Dashboard', PATHS.DASHBOARD, homeIcon),
          item('beneficiaries', 'Beneficiários', PATHS.BENEFICIARIES, beneficiariesIcon),
          item('transfers', 'Transferências', PATHS.TRANSFERS, transfersIcon),
          item('members', 'Membros', PATHS.MEMBERS, clientsIcon),
        ]
  items.push(item('settings', 'Configurações', PATHS.SETTINGS, settingsIcon))
  const footerItems: NavigationItem[] = [
    {
      id: 'support',
      label: 'Suporte',
      icon: icon(supportIcon),
      onClick: () => setSupportChatOpen((open) => !open),
    },
    { id: 'logout', label: 'Sair', icon: icon(logoutIcon), onClick: clearLoginToken },
  ]
  const activeId = pathname.startsWith(PATHS.SETTINGS)
    ? 'settings'
    : pathname === PATHS.DASHBOARD || pathname === PATHS.ADMIN_DASHBOARD
      ? 'dashboard'
      : admin
        ? pathname.startsWith(PATHS.ADMIN_TRANSFERS)
          ? 'admin-transfers'
          : pathname.startsWith(PATHS.ADMIN_BENEFICIARIES)
            ? 'admin-beneficiaries'
            : pathname.startsWith(PATHS.ADMIN_SECURITY)
              ? 'security-requests'
              : 'clients'
        : pathname.startsWith('/app/transferencias')
          ? 'transfers'
          : pathname.startsWith(PATHS.MEMBERS)
            ? 'members'
            : 'beneficiaries'
  const name = admin
    ? (user?.name ?? '')
    : company?.tradeName || company?.legalName || user?.name || ''
  const account = {
    name,
    description: admin
      ? 'Painel administrativo'
      : company
        ? `CNPJ: ${maskCNPJ(company.cnpj)}`
        : 'Conta empresarial',
    initials: initials(name),
  }
  // Telas de membros (Figma 07–16): título empresarial e identificação de quem está usando.
  const header =
    !admin && pathname.startsWith(PATHS.MEMBERS) && user ? (
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-sage-300 bg-white px-4 py-4 md:px-8">
        <p className="text-base font-medium text-slate-900">V-Stable • Conta empresarial</p>
        <p className="text-sm font-medium text-slate-900">
          {user.name} • {initials(user.name)}
        </p>
      </header>
    ) : undefined
  return (
    <ApplicationShell
      header={header}
      navigation={
        <NavBar
          logo={<img src={logo} alt="V-Stable" className="h-[60px] w-[149px] object-contain" />}
          items={items}
          activeId={activeId}
          account={account}
          footerItems={footerItems}
        />
      }
    >
      <Outlet />
      <SupportChatWidget open={supportChatOpen} onOpenChange={setSupportChatOpen} />
    </ApplicationShell>
  )
}

// Carregado sob demanda: os gráficos (Recharts) ficam fora do pacote inicial da aplicação.
const Dashboard = lazy(() =>
  import('@/features/dashboard/pages/Dashboard').then((module) => ({ default: module.Dashboard })),
)
function DashboardRoute({ admin = false }: { admin?: boolean }) {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8">
          Carregando dashboard...
        </p>
      }
    >
      <Dashboard admin={admin} />
    </Suspense>
  )
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path={PATHS.HOME} element={<RoleLanding />} />
      <Route element={<RoleGuard role="ADMIN" />}>
        <Route element={<RoutedApplication />}>
          <Route path={PATHS.ADMIN_DASHBOARD} element={<DashboardRoute admin />} />
          <Route path={PATHS.ADMIN_CLIENTS} element={<AdminClients />} />
          <Route path={PATHS.ADMIN_TRANSFERS} element={<AdminTransfers />} />
          <Route path={PATHS.ADMIN_BENEFICIARIES} element={<BeneficiaryView />} />
          <Route path={PATHS.ADMIN_SECURITY} element={<AdminSecurityRequests />} />
        </Route>
      </Route>
      <Route element={<RoleGuard role="USER" />}>
        <Route element={<RoutedApplication />}>
          <Route path={PATHS.DASHBOARD} element={<DashboardRoute />} />
          <Route path={PATHS.BENEFICIARIES} element={<BeneficiariesLanding />} />
          <Route path={PATHS.BENEFICIARIES_NEW} element={<BeneficiaryCreate />} />
          <Route path={PATHS.TRANSFERS} element={<TransferCreate />} />
          <Route path={PATHS.TRANSFER_DETAILS} element={<TransferDetails />} />
          <Route path={PATHS.MEMBERS} element={<Members />} />
        </Route>
      </Route>
      <Route element={<RoleGuard />}>
        <Route element={<RoutedApplication />}>
          <Route path={PATHS.SETTINGS} element={<Settings />} />
        </Route>
        <Route path={PATHS.COMPANY_SETUP} element={<CompanySetupRoute />} />
      </Route>
      <Route path="/beneficiarios" element={<LegacyRedirect to={PATHS.BENEFICIARIES} />} />
      <Route path="/beneficiarios/novo" element={<LegacyRedirect to={PATHS.BENEFICIARIES_NEW} />} />
      <Route path="/transferencias" element={<LegacyRedirect to={PATHS.TRANSFERS} />} />
      <Route path="/transferencias/nova" element={<LegacyRedirect to={PATHS.TRANSFERS} />} />
      <Route path="/transferencias/:id" element={<LegacyRedirect details />} />
      <Route path="/configuracoes" element={<LegacyRedirect to={PATHS.SETTINGS} />} />
      <Route path={PATHS.LOGIN} element={<Login resolveDestination={postLoginDestination} />} />
      <Route path={PATHS.COMPANY_INVITATION} element={<CompanyInvitation />} />
      <Route path={PATHS.REGISTER} element={<Register />} />
      <Route path={PATHS.REGISTER_COMPANY} element={<CompanyRoute />} />
      <Route path={PATHS.REGISTER_REPRESENTATIVE} element={<RepresentativeRoute />} />
      <Route path={PATHS.REGISTER_2FA} element={<TwoFactorRoute />} />
      <Route path={PATHS.REGISTER_COMPLIANCE} element={<ComplianceRoute />} />
      <Route path={PATHS.COMPLIANCE_LIVENESS} element={<LivenessRoute />} />
      <Route path={PATHS.REGISTER_COMPLETE} element={<RegistrationComplete />} />
      <Route path={PATHS.REGISTER_STATUS} element={<RegisterStatus />} />
      <Route
        path={PATHS.FORGOT_PASSWORD}
        element={<div className="p-8">Recuperação de Senha (Em breve)</div>}
      />
      <Route path="*" element={<RoleLanding />} />
    </Routes>
  )
}
