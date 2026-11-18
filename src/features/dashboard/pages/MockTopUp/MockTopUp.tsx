import { useNavigate } from 'react-router'
import { MockTopUpForm } from '@/features/dashboard/components/MockTopUpForm'
import { useBalance } from '@/features/dashboard/hooks/useBalance'
import { formatBrl, useMockTopUp } from '@/features/dashboard/hooks/useMockTopUp'
import { Button } from '@/shared/components/Button'
import { PATHS } from '@/shared/navigation/paths'

/** Dedicated mock-credit page. Only the server can authorize an actual balance change. */
export function MockTopUp() {
  const navigate = useNavigate()
  const { state, retry } = useBalance()
  const topUp = useMockTopUp(state, retry)

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Adicionar saldo</h1>
        <p className="text-sm text-slate-600">
          Simulação: nenhum pagamento ou transferência real será realizado.
        </p>
      </header>

      <div className="rounded-xl border border-sage-300 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Saldo disponível em BRL</h2>
        {state.status === 'loading' && <p role="status">Carregando saldo...</p>}
        {state.status === 'error' && (
          <div className="mt-3 flex flex-col gap-3" role="alert">
            <p>{state.message}</p>
            <Button variant="secondary" label="Tentar carregar novamente" onClick={retry} />
          </div>
        )}
        {state.status === 'ready' && (
          <p className="mt-2 font-mono text-3xl font-semibold text-slate-900">
            {formatBrl(state.balance)}
          </p>
        )}
      </div>

      {topUp.permitted ? (
        <MockTopUpForm
          topUp={topUp}
          balanceReady={state.status === 'ready'}
          heading={<h2 className="text-lg font-semibold text-slate-900">Crédito fictício</h2>}
          secondaryLabel="Voltar"
          onSecondary={() => navigate(PATHS.DASHBOARD)}
          className="rounded-xl border border-sage-300 bg-white p-6"
        />
      ) : (
        <p role="alert" className="rounded-xl border border-sage-300 bg-white p-6 text-slate-700">
          Apenas o proprietário com acesso ativo pode solicitar crédito simulado.
        </p>
      )}
    </section>
  )
}
