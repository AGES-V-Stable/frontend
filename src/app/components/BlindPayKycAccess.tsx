import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import {
  loadIndividualKycStatus,
  type IndividualKycStatus,
} from '@/features/onboarding/api/blindpayIndividualKyc'
import { describeKycStatus } from '@/features/onboarding/pages/BlindPayComplement/kycStatus'
import { Button } from '@/shared/components/Button'
import { PATHS } from '@/shared/navigation/paths'

type LoadState =
  { kind: 'loading' } | { kind: 'ready'; status: IndividualKycStatus } | { kind: 'error' }

interface Props {
  variant: 'dashboard' | 'settings'
}

/**
 * Ponto de retomada do KYC para usuários autenticados. A camada da aplicação
 * concentra a integração entre onboarding, Dashboard e Configurações.
 */
export function BlindPayKycAccess({ variant }: Props) {
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    let current = true
    loadIndividualKycStatus().then(
      (status) => {
        if (current) setState({ kind: 'ready', status })
      },
      () => {
        if (current) setState({ kind: 'error' })
      },
    )
    return () => {
      current = false
    }
  }, [attempt])

  const openKyc = () => void navigate(PATHS.BLINDPAY_KYC)

  if (variant === 'dashboard') {
    if (state.kind !== 'ready' || state.status.submitted) return null
    return (
      <section
        aria-labelledby="blindpay-dashboard-title"
        className="flex flex-col gap-4 rounded-xl border border-amber-700 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 id="blindpay-dashboard-title" className="font-bold text-slate-900">
            Complete sua verificação de identidade
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            Finalize os dados e documentos solicitados para concluir seu cadastro na BlindPay.
          </p>
        </div>
        <div className="w-full shrink-0 sm:w-52">
          <Button type="button" label="Completar cadastro" onClick={openKyc} />
        </div>
      </section>
    )
  }

  let title = 'Consultando verificação...'
  let description = 'Aguarde enquanto verificamos a situação do seu cadastro.'
  let tone = 'border-sage-300 bg-slate-50'
  let action: ReactNode

  if (state.kind === 'error') {
    title = 'Não foi possível consultar a verificação'
    description = 'Tente novamente para conferir ou continuar seu cadastro.'
    tone = 'border-red-300 bg-red-50'
    action = (
      <Button
        type="button"
        variant="secondary"
        label="Tentar novamente"
        onClick={() => {
          setState({ kind: 'loading' })
          setAttempt((value) => value + 1)
        }}
      />
    )
  } else if (state.kind === 'ready' && !state.status.submitted) {
    title = 'Cadastro pendente'
    description = 'Complete seus dados e documentos para iniciar a verificação de identidade.'
    tone = 'border-amber-700 bg-amber-50'
    action = <Button type="button" label="Completar cadastro" onClick={openKyc} />
  } else if (state.kind === 'ready') {
    const view = describeKycStatus(state.status)
    title = view.title
    description = view.description
    tone =
      view.tone === 'success'
        ? 'border-primary bg-emerald-50'
        : view.tone === 'danger'
          ? 'border-red-700 bg-red-50'
          : view.tone === 'warning'
            ? 'border-amber-700 bg-amber-50'
            : 'border-sage-300 bg-slate-50'
    action = (
      <Button type="button" variant="secondary" label="Consultar verificação" onClick={openKyc} />
    )
  }

  return (
    <section
      aria-labelledby="blindpay-settings-title"
      className="flex flex-col gap-4 rounded-xl border border-sage-300 bg-white p-6 shadow-2xs"
    >
      <div>
        <h2 id="blindpay-settings-title" className="text-lg font-bold text-slate-900">
          Verificação de identidade
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Acompanhe ou complete o cadastro necessário para os serviços da BlindPay.
        </p>
      </div>
      <div
        className={`flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${tone}`}
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        {action && <div className="w-full shrink-0 sm:w-56">{action}</div>}
      </div>
    </section>
  )
}
