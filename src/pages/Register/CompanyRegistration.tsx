import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { companyPath, compliancePath, completionPath, PATHS } from '@/routes/paths'
import { ApiError, getRegistration, saveCompany, submitCompliance } from '@/services/registration'
import type { CompanyData, RegistrationProgress } from '@/types/registration'
import type { ComplianceFormData } from '@/types/compliance'
import ComplianceStep from './ComplianceStep'
import { CompletionStep } from './CompletionStep'
import { CompanyStep } from './CompanyStep'

const isSaved = (progress: RegistrationProgress) => !!progress.empresaId && progress.etapaAtual >= 3
const failureMessage = (error: unknown) =>
  error instanceof ApiError && error.status < 500
    ? error.message
    : 'Não foi possível concluir a solicitação. Tente novamente.'

export function CompanyRegistration({
  compliance = false,
  completion = false,
}: {
  compliance?: boolean
  completion?: boolean
}) {
  const { progressoCadastroId: id } = useParams()
  // Remount when the token changes so stale progress and form data cannot cross registrations.
  return <Registration key={id} id={id} compliance={compliance} completion={completion} />
}

function Registration({
  id,
  compliance,
  completion,
}: {
  id?: string
  compliance: boolean
  completion: boolean
}) {
  const navigate = useNavigate()
  const [progress, setProgress] = useState<RegistrationProgress | null>(null)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const locked = useRef(false)
  const validId = !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  useEffect(() => {
    if (!validId || !id) return
    const controller = new AbortController()
    getRegistration(id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setProgress(value)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setLoadError(
            error instanceof ApiError && error.status === 404
              ? 'Cadastro não encontrado. Verifique o link de cadastro.'
              : failureMessage(error),
          )
      })
    return () => controller.abort()
  }, [id, validId, retry])

  async function submit(data: CompanyData) {
    if (!id || locked.current) return
    locked.current = true
    setSaving(true)
    setSaveError('')
    try {
      // Reconcile before every attempt, including retries after an uncertain response.
      const current = await getRegistration(id)
      if (!isSaved(current)) {
        const result = await saveCompany(id, data)
        setProgress({
          token: result.progresso_cadastro_id,
          empresaId: result.empresa_id,
          etapaAtual: result.etapa_atual,
        })
      } else setProgress(current)
      navigate(compliancePath(id), { replace: true })
    } catch (error) {
      try {
        const current = await getRegistration(id)
        if (isSaved(current)) {
          setProgress(current)
          navigate(compliancePath(id), { replace: true })
          return
        }
      } catch {
        /* Preserve entered values when reconciliation is unavailable. */
      }
      setSaveError(failureMessage(error))
    } finally {
      locked.current = false
      setSaving(false)
    }
  }

  async function submitDocuments(data: ComplianceFormData) {
    if (!id || locked.current) return
    locked.current = true
    setSaving(true)
    setSaveError('')
    try {
      const result = await submitCompliance(id, data)
      setProgress({
        token: result.progresso_cadastro_id,
        empresaId: result.empresa_id,
        etapaAtual: result.etapa_atual,
        statusGeral: result.status_geral,
        statusComplianceFinal: result.status_compliance_final,
      })
      navigate(completionPath(id), { replace: true })
    } catch (error) {
      try {
        const current = await getRegistration(id)
        if (current.etapaAtual >= 4) {
          setProgress(current)
          navigate(completionPath(id), { replace: true })
          return
        }
      } catch {
        /* Keep selected files available for another attempt. */
      }
      setSaveError(failureMessage(error))
    } finally {
      locked.current = false
      setSaving(false)
    }
  }

  if (!validId || loadError)
    return (
      <main className="mx-auto max-w-xl p-8">
        <p role="alert">
          {loadError ||
            'Link de cadastro ausente ou inválido. Use o link com o identificador do cadastro.'}
        </p>
        {loadError && (
          <button
            onClick={() => {
              setLoadError('')
              setRetry(retry + 1)
            }}
          >
            Tentar novamente
          </button>
        )}
        <Link className="block underline" to={PATHS.REGISTER}>
          Voltar ao cadastro
        </Link>
      </main>
    )
  if (!progress)
    return (
      <p role="status" className="p-8">
        Carregando cadastro...
      </p>
    )
  if (progress.etapaAtual >= 4) {
    if (!completion) return <Navigate to={completionPath(id!)} replace />
    return <CompletionStep />
  }
  if (completion)
    return <Navigate to={isSaved(progress) ? compliancePath(id!) : companyPath(id!)} replace />
  if (isSaved(progress)) {
    if (!compliance) return <Navigate to={compliancePath(id!)} replace />
    return <ComplianceStep onContinue={submitDocuments} saving={saving} serverError={saveError} />
  }
  if (progress.etapaAtual !== 2 || progress.empresaId)
    return (
      <p role="alert" className="p-8">
        Cadastro não está disponível para inclusão da empresa.
      </p>
    )
  if (compliance) return <Navigate to={companyPath(id!)} replace />
  return (
    <CompanyStep
      onCancel={() => navigate(PATHS.REGISTER)}
      onContinue={submit}
      saving={saving}
      serverError={saveError}
    />
  )
}
