import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router'

import AdminClients from '@/pages/AdminClients'
import { Home } from '@/pages/Home'
import LivenessStep from '@/pages/LivenessStep'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import ComplianceStep from '@/pages/Register/ComplianceStep'
import RegistrationComplete from '@/pages/Register/RegistrationComplete'

import { livenessPath, PATHS, registrationCompletePath } from './paths'

function ComplianceRoute() {
  const { kycVerificationId } = useParams()
  const navigate = useNavigate()

  return (
    <ComplianceStep
      progressoCadastroId={kycVerificationId}
      onContinue={() => navigate(livenessPath(kycVerificationId!))}
    />
  )
}

function LivenessRoute() {
  const { kycVerificationId } = useParams()
  const navigate = useNavigate()

  return (
    <LivenessStep
      progressoCadastroId={kycVerificationId}
      onContinue={() => navigate(registrationCompletePath(kycVerificationId!), { replace: true })}
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
      <Route path={PATHS.REGISTER_COMPLIANCE} element={<ComplianceRoute />} />
      <Route path={PATHS.COMPLIANCE_LIVENESS} element={<LivenessRoute />} />
      <Route path={PATHS.REGISTER_COMPLETE} element={<RegistrationComplete />} />

      <Route path="*" element={<Navigate to={PATHS.HOME} replace />} />
    </Routes>
  )
}

export default AppRoutes
