import { Navigate, Route, Routes } from 'react-router'

import AdminClients from '@/pages/AdminClients'
import { Home } from '@/pages/Home'
import AdminClients from '../pages/AdminClients'
import AdminTransfers from '../pages/AdminTransfers'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import ComplianceStep from '@/pages/Register/ComplianceStep'
import RegistrationComplete from '@/pages/Register/RegistrationComplete'
import { RepresentativeStep } from '@/pages/Register/RepresentativeStep'
import { Home } from '@/pages/Home'
import { Demo, DemoCompany, DemoCompliance, DemoRepresentative } from '@/pages/Demo'
import { BeneficiaryView } from '@/pages/admin/beneficiaryView'
import { ClientLayout } from '@/pages/client/ClientLayout'
import { BeneficiariesLanding } from '@/pages/client/beneficiaries/BeneficiariesLanding'
import { BeneficiaryCreate } from '@/pages/client/beneficiaryCreate'
import { RegisterStatus } from '@/pages/RegisterStatus/RegisterStatus'
import { startDocumentUpload, submitDocumentResult, uploadFileToS3 } from '@/services/compliance'
import { ApiError, saveRepresentativePersonalData, submitOnboarding } from '@/services/onboarding'
import type { ComplianceFormData, TipoDocumento } from '@/types/compliance'
import type { AccessData, CompanyData, RepresentativeData } from '@/types/registration'

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
      <Route path={PATHS.REGISTER_COMPLIANCE} element={<ComplianceRoute />} />
      <Route path={PATHS.COMPLIANCE_LIVENESS} element={<LivenessRoute />} />
      <Route path={PATHS.REGISTER_COMPLETE} element={<RegistrationComplete />} />

      <Route path="*" element={<Navigate to={PATHS.HOME} replace />} />
    </Routes>
  )
}

export default AppRoutes
