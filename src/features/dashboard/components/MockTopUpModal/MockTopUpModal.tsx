import { useId } from 'react'
import { MockTopUpForm } from '@/features/dashboard/components/MockTopUpForm'
import type { BalanceState } from '@/features/dashboard/hooks/useBalance'
import { formatBrl, useMockTopUp } from '@/features/dashboard/hooks/useMockTopUp'
import { Modal } from '@/shared/components/Modal'

export interface MockTopUpModalProps {
  /** Saldo exibido no Dashboard: o modal usa o mesmo, então o card atualiza junto. */
  balance: BalanceState
  refreshBalance: () => void
  onClose: () => void
}

/** A tela de Adicionar saldo como diálogo, aberto pelo atalho do card de saldo. */
export function MockTopUpModal({ balance, refreshBalance, onClose }: MockTopUpModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const topUp = useMockTopUp(balance, refreshBalance)

  return (
    <Modal
      labelledBy={titleId}
      describedBy={descriptionId}
      busy={topUp.submitting}
      onClose={onClose}
    >
      <header className="flex flex-col gap-1">
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          Adicionar saldo
        </h2>
        <p id={descriptionId} className="text-sm text-slate-600">
          Simulação: nenhum pagamento ou transferência real será realizado.
        </p>
      </header>

      <div className="flex items-baseline justify-between gap-3 rounded-lg border border-sage-300 p-4">
        <span className="text-sm text-slate-600">Saldo disponível em BRL</span>
        {balance.status === 'loading' && (
          <span role="status" className="text-sm text-slate-600">
            Carregando saldo...
          </span>
        )}
        {balance.status === 'error' && (
          <span role="alert" className="text-sm text-slate-700">
            {balance.message}
          </span>
        )}
        {balance.status === 'ready' && (
          <span className="font-mono text-xl font-semibold text-slate-900">
            {formatBrl(balance.balance)}
          </span>
        )}
      </div>

      {topUp.permitted ? (
        <MockTopUpForm
          topUp={topUp}
          balanceReady={balance.status === 'ready'}
          secondaryLabel={topUp.success ? 'Fechar' : 'Cancelar'}
          onSecondary={onClose}
        />
      ) : (
        <p role="alert" className="text-sm text-slate-700">
          Apenas o proprietário com acesso ativo pode solicitar crédito simulado.
        </p>
      )}
    </Modal>
  )
}
