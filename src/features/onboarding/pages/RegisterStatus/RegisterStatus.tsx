import { Navigate, useNavigate } from 'react-router'
import { useSession } from '@/features/auth'
import { ComplianceStatusCard } from '@/features/onboarding/components/ComplianceStatusCard/ComplianceStatusCard'
import { useRegistrationStatus } from '@/features/onboarding/hooks/useRegistrationStatus'
import { Button } from '@/shared/components/Button'
import { PATHS } from '@/shared/navigation/paths'

function RegisterStatus() {
  const { state, reload } = useRegistrationStatus()
  const session = useSession()
  const navigate = useNavigate()
  // O card lê o estado do 2FA ao montar; com sessão, ele vem do backend (/v1/users/me).
  const ready = state.kind === 'status' && session.status !== 'loading'

  if (state.kind === 'unauthenticated')
    return <Navigate to={PATHS.LOGIN} replace state={{ from: PATHS.REGISTER_STATUS }} />
  if (state.kind === 'resume') return <Navigate to={state.path} replace />

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-y-[56px]">
      {(state.kind === 'loading' || (state.kind === 'status' && !ready)) && (
        <p role="status">Carregando a situação do cadastro...</p>
      )}
      {ready && (
        <ComplianceStatusCard
          status={state.status}
          onRefresh={reload}
          initialTwoFactorActive={session.user?.twoFactorEnabled}
        />
      )}
      {(state.kind === 'error' || state.kind === 'not-found') && (
        <div role="alert" className="flex flex-col items-center gap-y-4">
          <p className="text-slate-900">
            {state.kind === 'not-found'
              ? 'Nenhum cadastro foi encontrado para esta conta.'
              : 'Não foi possível carregar a situação do seu cadastro.'}
          </p>
          <div className="w-[220px]">
            {state.kind === 'not-found' ? (
              <Button label="Iniciar cadastro" onClick={() => navigate(PATHS.REGISTER)} />
            ) : (
              <Button label="Tentar novamente" variant="secondary" onClick={reload} />
            )}
          </div>
        </div>
      )}
      <p className="text-slate-500 text-[14px] font-regular">
        Precisa de ajuda? Entre em contato com o suporte da V-Stable.
      </p>
    </div>
  )
}

export { RegisterStatus }
