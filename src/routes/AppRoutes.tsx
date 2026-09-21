import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router'

import AdminClients from '@/pages/AdminClients'
import { Home } from '@/pages/Home'
import LivenessStep from '@/pages/LivenessStep'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { CompanyRegistration } from '@/pages/Register/CompanyRegistration'
import RegistrationComplete from '@/pages/Register/RegistrationComplete'

import { PATHS, registrationCompletePath } from './paths'

function LivenessRoute() {
  const { progressoCadastroId } = useParams()
  const navigate = useNavigate()

  return (
    <LivenessStep
      progressoCadastroId={progressoCadastroId}
      onContinue={() => navigate(registrationCompletePath(progressoCadastroId!), { replace: true })}
    />
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path={PATHS.HOME} element={<Home />} />
      <Route path={PATHS.ADMIN_CLIENTS} element={<AdminClients />} />
      <Route path={PATHS.LOGIN} element={<Login />} />
      <Route path={PATHS.REGISTER} element={<Register />} />
      <Route path={PATHS.REGISTER_COMPANY} element={<CompanyRegistration />} />
      <Route path={PATHS.REGISTER_COMPANY_PROGRESS} element={<CompanyRegistration />} />
      <Route path={PATHS.REGISTER_COMPLIANCE} element={<CompanyRegistration compliance />} />
      <Route path={PATHS.COMPLIANCE_LIVENESS} element={<LivenessRoute />} />
      <Route path={PATHS.REGISTER_COMPLETE} element={<RegistrationComplete />} />

      <Route path="*" element={<Navigate to={PATHS.HOME} replace />} />
    </Routes>
  )
}

export default AppRoutes
