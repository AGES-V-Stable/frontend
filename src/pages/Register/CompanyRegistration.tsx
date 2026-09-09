import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { companyPath, compliancePath, PATHS } from '@/routes/paths'
import { ApiError, getRegistration, saveCompany } from '@/services/registration'
import type { CompanyData, RegistrationProgress } from '@/types/registration'
import { CompanyStep } from './CompanyStep'

const isSaved = (progress: RegistrationProgress) => !!progress.empresaId && progress.etapaAtual >= 3
const failureMessage = (error: unknown) =>
  error instanceof ApiError && error.status < 500
    ? error.message
    : 'Não foi possível concluir a solicitação. Tente novamente.'

export function CompanyRegistration({ compliance = false }: { compliance?: boolean }) {
  const { progressoCadastroId: id } = useParams()
  // Remount when the token changes so stale progress and form data cannot cross registrations.
  return <Registration key={id} id={id} compliance={compliance} />
}

function Registration({ id, compliance }: { id?: string; compliance: boolean }) {
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
  if (isSaved(progress)) {
    if (!compliance) return <Navigate to={compliancePath(id!)} replace />
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-bold">Compliance</h1>
        <p role="status">
          Empresa cadastrada com sucesso. A etapa de compliance ainda não está disponível.
        </p>
        <Link className="underline" to={PATHS.HOME}>
          Voltar ao início
        </Link>
      </main>
    )
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
