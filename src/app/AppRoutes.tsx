import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router'
import { isStoredAdmin, useSession, Settings, AdminSecurityRequests } from '@/features/auth'
import { Login } from '@/features/auth/pages/Login'
import AdminClients from '@/features/clients/pages/AdminClients'
import AdminTransfers from '@/features/transfers/pages/AdminTransfers'
import { BeneficiaryView } from '@/features/beneficiaries/pages/admin/beneficiaryView'
import { BeneficiariesLanding } from '@/features/beneficiaries/pages/client/beneficiaries/BeneficiariesLanding'
import { BeneficiaryCreate } from '@/features/beneficiaries/pages/client/beneficiaryCreate'
import { TransferCreate } from '@/features/transfers/pages/client/transferCreate'
import { TransferDetails } from '@/features/transfers/pages/client/transferDetails'
import { Register } from '@/features/onboarding/pages/Register'
import { RegisterStatus } from '@/features/onboarding/pages/RegisterStatus/RegisterStatus'
import RegistrationComplete from '@/features/onboarding/pages/Register/RegistrationComplete'
import {
  CompanyRoute,
  RepresentativeRoute,
  TwoFactorRoute,
  ComplianceRoute,
  LivenessRoute,
} from '@/features/onboarding/pages/WizardRoutes'
import { PATHS, transferDetailsPath } from '@/shared/navigation/paths'
import { maskCNPJ } from '@/shared/utils/masks'
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
            ? PATHS.ADMIN_CLIENTS
            : PATHS.BENEFICIARIES
      }
    />
  )
}
function RoleGuard({ role }: { role: 'ADMIN' | 'USER' }) {
  const { status, user } = useSession()
  if (status === 'loading' || status === 'error') return <SessionState />
  if (status === 'anonymous') return <Navigate to={PATHS.LOGIN} replace />
  if ((isStoredAdmin() ? 'ADMIN' : 'USER') !== role) return <RoleLanding />
  if (role === 'USER' && !user?.companyId)
    return (
      <p role="alert" className="p-8">
        Esta conta não possui vínculo empresarial.
      </p>
    )
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
        item('home', 'Início', PATHS.HOME, homeIcon),
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
    : [
        item('home', 'Início', PATHS.HOME, homeIcon),
        item('beneficiaries', 'Beneficiários', PATHS.BENEFICIARIES, beneficiariesIcon),
        item('transfers', 'Transferências', PATHS.TRANSFERS, transfersIcon),
      ]
  items.push({ id: 'settings', label: 'Configurações', icon: icon(settingsIcon), disabled: true })
  const activeId = admin
    ? pathname.startsWith(PATHS.ADMIN_TRANSFERS)
      ? 'admin-transfers'
      : pathname.startsWith(PATHS.ADMIN_BENEFICIARIES)
        ? 'admin-beneficiaries'
        : pathname.startsWith(PATHS.ADMIN_SECURITY)
          ? 'security-requests'
          : 'clients'
    : pathname.startsWith('/app/transferencias')
      ? 'transfers'
      : pathname.startsWith(PATHS.SETTINGS)
        ? 'settings'
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
  return (
    <ApplicationShell
      navigation={
        <NavBar
          logo={<img src={logo} alt="V-Stable" className="h-[60px] w-[149px] object-contain" />}
          items={items}
          activeId={activeId}
          account={account}
          supportIcon={icon(supportIcon)}
        />
      }
    >
      <Outlet />
    </ApplicationShell>
  )
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path={PATHS.HOME} element={<RoleLanding />} />
      <Route element={<RoleGuard role="ADMIN" />}>
        <Route element={<RoutedApplication />}>
          <Route path={PATHS.ADMIN_CLIENTS} element={<AdminClients />} />
          <Route path={PATHS.ADMIN_TRANSFERS} element={<AdminTransfers />} />
          <Route path={PATHS.ADMIN_BENEFICIARIES} element={<BeneficiaryView />} />
          <Route path={PATHS.ADMIN_SECURITY} element={<AdminSecurityRequests />} />
        </Route>
      </Route>
      <Route element={<RoleGuard role="USER" />}>
        <Route element={<RoutedApplication />}>
          <Route path={PATHS.BENEFICIARIES} element={<BeneficiariesLanding />} />
          <Route path={PATHS.BENEFICIARIES_NEW} element={<BeneficiaryCreate />} />
          <Route path={PATHS.TRANSFERS} element={<TransferCreate />} />
          <Route path={PATHS.TRANSFER_DETAILS} element={<TransferDetails />} />
          <Route path={PATHS.SETTINGS} element={<Settings />} />
        </Route>
      </Route>
      <Route path="/beneficiarios" element={<LegacyRedirect to={PATHS.BENEFICIARIES} />} />
      <Route path="/beneficiarios/novo" element={<LegacyRedirect to={PATHS.BENEFICIARIES_NEW} />} />
      <Route path="/transferencias" element={<LegacyRedirect to={PATHS.TRANSFERS} />} />
      <Route path="/transferencias/nova" element={<LegacyRedirect to={PATHS.TRANSFERS} />} />
      <Route path="/transferencias/:id" element={<LegacyRedirect details />} />
      <Route path="/configuracoes" element={<LegacyRedirect to={PATHS.SETTINGS} />} />
      <Route path={PATHS.LOGIN} element={<Login />} />
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
