import { getStoredUserType } from '@/shared/services/session'
import { PmeHome } from '@/features/home/content/pme/pages/PmeHome'
import { AuditHome } from '@/features/home/content/admin/pages/AuditHome'
import { useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router'

import AdminClients from '@/features/home/content/admin/pages/AdminClients'
import AdminTransfers from '@/features/home/content/admin/pages/AdminTransfers'
import LivenessStep from '@/features/login/compliance/pages/LivenessStep'
import { Login } from '@/features/login/pages/Login'
import { Register } from '@/features/login/pages/Register'
import { CompanyStep } from '@/features/login/pages/Register/CompanyStep'
import ComplianceStep from '@/features/login/compliance/pages/ComplianceStep'
import RegistrationComplete from '@/features/login/compliance/pages/RegistrationComplete'
import { RepresentativeStep } from '@/features/login/pages/Register/RepresentativeStep'
import { AdminHome } from '@/features/home/content/admin/pages/AdminHome'
import { Demo, DemoCompany, DemoCompliance, DemoRepresentative } from '@/app/routes/demo'
import { BeneficiaryView } from '@/features/home/content/admin/pages/beneficiaryView'
import { ClientLayout } from '@/features/home/content/pme/components/ClientLayout'
import { BeneficiariesLanding } from '@/features/home/content/pme/pages/beneficiaries/BeneficiariesLanding'
import { BeneficiaryCreate } from '@/features/home/content/pme/pages/beneficiaryCreate'
import { RegisterStatus } from '@/features/login/compliance/pages/RegisterStatus/RegisterStatus'
import {
  startDocumentUpload,
  submitDocumentResult,
  uploadFileToS3,
} from '@/features/login/compliance/services/compliance'
import {
  ApiError,
  saveRepresentativePersonalData,
  submitOnboarding,
} from '@/features/login/compliance/services/onboarding'
import type { ComplianceFormData, TipoDocumento } from '@/shared/types/compliance'
import type { AccessData, CompanyData, RepresentativeData } from '@/shared/types/registration'

import { compliancePath, livenessPath, PATHS, registrationCompletePath } from './paths'

const ForgotPassWordPlaceHolder = () => <div className="p-8">Recuperação de Senha (Em breve)</div>

interface CompanyRouteState {
  access?: AccessData
}

function CompanyRoute() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state as CompanyRouteState | null) ?? null

  if (!state?.access) return <Navigate to={PATHS.REGISTER} replace />

  return (
    <CompanyStep
      onCancel={() => navigate(PATHS.REGISTER)}
      onContinue={(company) =>
        navigate(PATHS.REGISTER_REPRESENTATIVE, { state: { access: state.access, company } })
      }
    />
  )
}

interface RepresentativeRouteState {
  access?: AccessData
  company?: CompanyData
}

function RepresentativeRoute() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state as RepresentativeRouteState | null) ?? null
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')

  if (!state?.access || !state?.company) return <Navigate to={PATHS.REGISTER} replace />

  const { access, company } = state

  async function handleContinue(representative: RepresentativeData) {
    setSaving(true)
    setServerError('')
    try {
      const isBrazil = company.pais.trim().toLowerCase() === 'brasil'
      const result = await submitOnboarding(
        {
          fullName: access.nomeCompleto,
          email: access.email,
          password: access.senha,
          confirmPassword: access.confirmarSenha,
          cargoFuncao: representative.cargo_funcao,
          participacaoSocietaria: representative.participacao_societaria,
          cpf: representative.cpf,
          dateOfBirth: representative.date_of_birth,
          phone: representative.phone,
          pais: representative.pais,
          cep: representative.cep,
          cidade: representative.cidade,
          estado: representative.estado,
          linhaEndereco: representative.linha_endereco,
        },
        company,
      )
      saveRepresentativePersonalData({
        fullName: access.nomeCompleto.trim(),
        email: access.email.trim(),
        phone: representative.phone.replace(/\D/g, ''),
        dateOfBirth: representative.date_of_birth,
        taxIdNumber: representative.cpf.replace(/\D/g, ''),
        country: representative.pais.trim(),
        state: representative.estado.trim(),
        city: representative.cidade.trim(),
        zipCode: isBrazil ? representative.cep.replace(/\D/g, '') : representative.cep.trim(),
        streetAddress: representative.linha_endereco.trim(),
      })
      void navigate(compliancePath(result.kycVerificationId))
    } catch (error) {
      setServerError(
        error instanceof ApiError && error.status < 500
          ? error.message
          : 'Não foi possível concluir a solicitação. Tente novamente.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <RepresentativeStep onContinue={handleContinue} saving={saving} serverError={serverError} />
  )
}

function ComplianceRoute() {
  const { kycVerificationId } = useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')

  async function handleContinue(data: ComplianceFormData) {
    if (!kycVerificationId) {
      setServerError(
        'Não foi possível confirmar o cadastro. Recarregue a página e tente novamente.',
      )
      return
    }

    const tipoDocumento = data.tipoDocumento as TipoDocumento
    const doubleSided = tipoDocumento !== 'PASSPORT'
    const [frontFile, backFile] = data.documentos

    if (!frontFile || (doubleSided && !backFile)) {
      setServerError('Selecione os arquivos do documento antes de continuar.')
      return
    }

    setSaving(true)
    setServerError('')
    try {
      const { id, uploadUrlFront, uploadUrlBack } = await startDocumentUpload(
        kycVerificationId,
        tipoDocumento,
        doubleSided,
      )
      await uploadFileToS3(uploadUrlFront, frontFile.file)
      if (doubleSided && uploadUrlBack) {
        await uploadFileToS3(uploadUrlBack, backFile.file)
      }
      await submitDocumentResult(kycVerificationId, id)
      void navigate(livenessPath(kycVerificationId))
    } catch {
      setServerError('Não foi possível enviar o documento. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return <ComplianceStep onContinue={handleContinue} saving={saving} serverError={serverError} />
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

function HomeRoute() {
  return getStoredUserType() === 'admin' ? <AdminHome /> : <PmeHome />
}

function BeneficiaryCreateRoute() {
  const navigate = useNavigate()
  return (
    <ClientLayout>
      <BeneficiaryCreate onCancel={() => navigate(PATHS.BENEFICIARIES)} />
    </ClientLayout>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path={PATHS.HOME} element={<HomeRoute />} />
      <Route path={PATHS.ADMIN_AUDIT} element={<AuditHome />} />
      <Route path={PATHS.ADMIN_CLIENTS} element={<AdminClients />} />
      <Route path={PATHS.ADMIN_TRANSFERS} element={<AdminTransfers />} />
      <Route path={PATHS.ADMIN_BENEFICIARIES} element={<BeneficiaryView />} />
      <Route path={PATHS.BENEFICIARIES} element={<BeneficiariesLanding />} />
      <Route path={PATHS.BENEFICIARIES_NEW} element={<BeneficiaryCreateRoute />} />
      <Route path={PATHS.LOGIN} element={<Login />} />
      <Route path={PATHS.REGISTER} element={<Register />} />
      <Route path={PATHS.REGISTER_COMPANY} element={<CompanyRoute />} />
      <Route path={PATHS.REGISTER_REPRESENTATIVE} element={<RepresentativeRoute />} />
      <Route path={PATHS.REGISTER_COMPLIANCE} element={<ComplianceRoute />} />
      <Route path={PATHS.COMPLIANCE_LIVENESS} element={<LivenessRoute />} />
      <Route path={PATHS.REGISTER_COMPLETE} element={<RegistrationComplete />} />
      <Route path={PATHS.FORGOT_PASSWORD} element={<ForgotPassWordPlaceHolder />} />
      <Route path={PATHS.DEMO} element={<Demo />} />
      <Route path={PATHS.DEMO_HOME} element={<HomeRoute />} />
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
