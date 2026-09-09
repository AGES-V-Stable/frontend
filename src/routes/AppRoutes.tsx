import { Navigate, Route, Routes } from 'react-router'

import AdminClients from '@/pages/AdminClients'
import { Home } from '@/pages/Home'
import LivenessStep from '@/pages/LivenessStep'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'

import { PATHS } from './paths'

function AppRoutes() {
  return (
    <Routes>
      <Route path={PATHS.HOME} element={<Home />} />
      <Route path="/admin/clientes-pme" element={<AdminClients />} />
      <Route path={PATHS.LOGIN} element={<Login />} />
      <Route path={PATHS.REGISTER} element={<Register />} />
      {/* TODO: progressoCadastroId virá do estado do wizard quando o fluxo de
          cadastro estiver implementado; por ora a etapa é acessível isoladamente. */}
      {/* HARDCODED TEMPORARIAMENTE PARA TESTE MANUAL — REVERTER ANTES DE COMMITAR */}
      <Route
        path={PATHS.COMPLIANCE_LIVENESS}
        element={<LivenessStep progressoCadastroId="5d78c2e7-dd89-49d4-9caa-d88a97dacfd7" />}
      />

      <Route path="*" element={<Navigate to={PATHS.HOME} replace />} />
    </Routes>
  )
}

export default AppRoutes
