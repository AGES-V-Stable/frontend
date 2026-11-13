import type { Invitation, InvitationRole } from '../../schemas/invitation'

const ROLES: Record<InvitationRole, { label: string; description: string }> = {
  OPERATOR: {
    label: 'Operador',
    description: 'Consulta os dados da empresa, cadastra beneficiários e inicia transferências.',
  },
  VIEWER: {
    label: 'Visualizador',
    description: 'Consulta saldo, beneficiários e transferências, sem realizar operações.',
  },
}

/** Dados definidos pelo convite: somente leitura, sem campos editáveis. */
export function InvitationSummary({ invitation }: { invitation: Invitation }) {
  const role = ROLES[invitation.role]
  const items = [
    { label: 'Empresa', value: invitation.company.name },
    { label: 'Convidado por', value: invitation.invitedBy.name },
    {
      label: 'Destinatário',
      value: invitation.recipient.name
        ? `${invitation.recipient.name} (${invitation.recipient.email})`
        : invitation.recipient.email,
    },
    { label: 'Perfil de acesso', value: role.label, detail: role.description },
  ]
  return (
    <dl className="grid gap-3 rounded-lg border border-sage-300 bg-surface p-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {item.label}
          </dt>
          <dd className="break-words text-[15px] font-semibold text-slate-900">{item.value}</dd>
          {item.detail && <dd className="text-sm text-slate-600">{item.detail}</dd>}
        </div>
      ))}
    </dl>
  )
}
