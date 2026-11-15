import type { ReactNode } from 'react'

import type { Settlement } from '@/features/dashboard/api/dashboard'
import { Drawer } from '@/shared/components/Drawer'
import { StatusBadge, type StatusVariant } from '@/shared/components/Table'
import { formatDateTime, formatMoneyString } from '@/shared/utils/formatters'

export interface SettlementDrawerProps {
  settlement: Settlement | null
  admin: boolean
  status: { label: string; variant: StatusVariant }
  onClose: () => void
  /** Leva à tela completa da transferência (comprovante no cliente, histórico no admin). */
  onOpenFull: (settlement: Settlement) => void
}

const money = (amount: string | null, currency = 'BRL') =>
  formatMoneyString(amount, currency) ?? 'Indisponível'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  )
}

/** Detalhe de uma liquidação aberto no próprio dashboard, com os dados já carregados na tabela. */
export function SettlementDrawer({
  settlement,
  admin,
  status,
  onClose,
  onOpenFull,
}: SettlementDrawerProps) {
  const date = settlement ? (settlement.settledAt ?? settlement.createdAt) : null
  return (
    <Drawer
      open={settlement !== null}
      title="Detalhes da transferência"
      onClose={onClose}
      actions={
        settlement
          ? [
              {
                label: admin ? 'Ver no histórico' : 'Abrir detalhe completo',
                variant: 'primary',
                onClick: () => onOpenFull(settlement),
              },
            ]
          : []
      }
    >
      {settlement && (
        <div className="space-y-5 text-sm text-slate-900">
          <Field label="ID da transação">
            <p className="text-base font-semibold break-all">{settlement.id}</p>
          </Field>
          {admin && <Field label="Empresa">{settlement.companyName ?? 'Não registrada'}</Field>}
          <Field label={settlement.direction === 'RECEIPT' ? 'Pagador' : 'Beneficiário'}>
            <p>{settlement.counterparty ?? 'Não registrado'}</p>
            {settlement.destination && (
              <p className="text-xs text-slate-500">{settlement.destination}</p>
            )}
          </Field>
          <Field label="Data / Hora">{date ? formatDateTime(date) : 'Não registrada'}</Field>
          <Field label="Tipo">
            {settlement.direction === 'PAYMENT'
              ? 'Pagamento'
              : settlement.direction === 'RECEIPT'
                ? 'Recebimento'
                : 'Não registrado'}
          </Field>
          <Field label="Status">
            <StatusBadge label={status.label} variant={status.variant} />
          </Field>
          <Field label="Valor">
            <span className="font-mono font-medium">
              {money(settlement.amount, settlement.currency)}
            </span>
          </Field>
          <Field label="Valor em BRL">
            <span className="font-mono font-medium">{money(settlement.amountBrl)}</span>
          </Field>
          <Field label="Câmbio">{money(settlement.exchangeRate)}</Field>
          <Field label="Tarifa">{money(settlement.feeBrl)}</Field>
          {settlement.savings !== null && (
            <Field label="Economia estimada">{money(settlement.savings)}</Field>
          )}
        </div>
      )}
    </Drawer>
  )
}
