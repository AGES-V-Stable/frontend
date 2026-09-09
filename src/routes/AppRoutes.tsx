import { Navigate, Route, Routes } from 'react-router'

import AdminClients from '@/pages/AdminClients'
import { Home } from '@/pages/Home'
import LivenessStep from '@/pages/LivenessStep'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { CompanyRegistration } from '@/pages/Register/CompanyRegistration'

import { PATHS } from './paths'

function AppRoutes() {
  return (
    <Routes>
      <Route path={PATHS.HOME} element={<Home />} />
      <Route path={PATHS.ADMIN_CLIENTS} element={<AdminClients />} />
      <Route path={PATHS.LOGIN} element={<Login />} />
      <Route path={PATHS.REGISTER} element={<Register />} />
      <Route path={PATHS.REGISTER_COMPANY} element={<CompanyRegistration />} />
      <Route path={PATHS.REGISTER_COMPANY_PROGRESS} element={<CompanyRegistration />} />
      <Route
        path={PATHS.REGISTER_COMPLIANCE}
        element={<CompanyRegistration compliance />}
      />
      {/* TODO: progressoCadastroId virá do estado do wizard quando o fluxo de
          cadastro estiver implementado; por ora a etapa é acessível isoladamente. */}
      <Route path={PATHS.COMPLIANCE_LIVENESS} element={<LivenessStep />} />

      <Route path="*" element={<Navigate to={PATHS.HOME} replace />} />
    </Routes>
  )
}

export default AppRoutes
