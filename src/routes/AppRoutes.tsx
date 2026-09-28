import { Navigate, Route, Routes } from 'react-router'

import { Home } from '@/pages/Home'
import AdminClients from '../pages/AdminClients'
import AdminTransfers from '../pages/AdminTransfers'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { CompanyRegistration } from '@/pages/Register/CompanyRegistration'
import { Demo, DemoCompany, DemoCompliance, DemoRepresentative } from '@/pages/Demo'
import { BeneficiaryView } from '@/pages/admin/beneficiaryView'
import { ClientLayout } from '@/pages/client/ClientLayout'
import { BeneficiariesLanding } from '@/pages/client/beneficiaries/BeneficiariesLanding'
import { BeneficiaryCreate } from '@/pages/client/beneficiaryCreate'

import { PATHS } from './paths'
import { RegisterStatus } from '@/pages/RegisterStatus/RegisterStatus'

const ForgotPassWordPlaceHolder = () => <div className="p-8">Recuperação de Senha (Em breve)</div>

function AppRoutes() {
  return (
    <Routes>
      <Route path={PATHS.HOME} element={<Home />} />
      <Route path={PATHS.ADMIN_CLIENTS} element={<AdminClients />} />
      <Route path={PATHS.ADMIN_TRANSFERS} element={<AdminTransfers />} />
      <Route path={PATHS.ADMIN_BENEFICIARIES} element={<BeneficiaryView />} />
      <Route path={PATHS.BENEFICIARIES} element={<BeneficiariesLanding />} />
      <Route
        path={PATHS.BENEFICIARIES_NEW}
        element={
          <ClientLayout activeItemId="beneficiaries">
            <BeneficiaryCreate />
          </ClientLayout>
        }
      />
      <Route path={PATHS.LOGIN} element={<Login />} />
      <Route path={PATHS.REGISTER} element={<Register />} />
      <Route path={PATHS.FORGOT_PASSWORD} element={<ForgotPassWordPlaceHolder />} />
      <Route path={PATHS.REGISTER_COMPANY} element={<CompanyRegistration />} />
      <Route path={PATHS.REGISTER_COMPANY_PROGRESS} element={<CompanyRegistration />} />
      <Route
        path={PATHS.REGISTER_REPRESENTATIVE}
        element={<CompanyRegistration representative />}
      />
      <Route path={PATHS.REGISTER_COMPLIANCE} element={<CompanyRegistration compliance />} />
      <Route path={PATHS.REGISTER_COMPLETE} element={<CompanyRegistration completion />} />
      <Route path={PATHS.DEMO} element={<Demo />} />
      <Route path={PATHS.DEMO_HOME} element={<Home />} />
      <Route path={PATHS.DEMO_LOGIN} element={<Login />} />
      <Route
        path={PATHS.DEMO_REGISTER}
        element={<Navigate to={PATHS.DEMO_REGISTER_COMPANY} replace />}
      />
      <Route path={PATHS.DEMO_REGISTER_COMPANY} element={<DemoCompany />} />
      <Route path={PATHS.DEMO_REGISTER_REPRESENTATIVE} element={<DemoRepresentative />} />
      <Route path={PATHS.DEMO_REGISTER_COMPLIANCE} element={<DemoCompliance />} />
      <Route path={PATHS.DEMO_ADMIN_CLIENTS} element={<AdminClients />} />
      <Route path={PATHS.REGISTER_STATUS} element={<RegisterStatus />} />

      <Route path="*" element={<Navigate to={PATHS.HOME} replace />} />
    </Routes>
  )
}

export default AppRoutes
