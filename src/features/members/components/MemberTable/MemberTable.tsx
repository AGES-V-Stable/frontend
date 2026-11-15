import type { ReactNode } from 'react'
import { StatusBadge, Table, TableActionButton } from '@/shared/components/Table'
import type { ColumnDefinition, PaginationProps } from '@/shared/components/Table'
import { canManageMember, ROLE_LABELS } from '../../model/permissions'
import type { MemberViewer } from '../../model/permissions'
import type { Invitation, Member, MemberListItem } from '../../schemas/members'

export interface MemberTableProps {
  items: MemberListItem[]
  peopleCount: number
  viewer: MemberViewer
  pagination?: PaginationProps
  onManage: (member: Member) => void
  /** Copia o link vigente do convite pendente, sem gerar um novo. */
  onCopyInvitationLink: (invitation: Invitation) => void
  onManageInvitation: (invitation: Invitation) => void
  /** Convite cujo link está sendo buscado para cópia. */
  copyingInvitationId?: string | null
  /** Conteúdo dentro do cartão, abaixo das linhas (estado inicial da equipe). */
  footer?: ReactNode
}

const person = (item: MemberListItem) => (item.kind === 'MEMBER' ? item.member : item.invitation)

export function MemberTable({
  items,
  peopleCount,
  viewer,
  pagination,
  onManage,
  onCopyInvitationLink,
  onManageInvitation,
  copyingInvitationId = null,
  footer,
}: MemberTableProps) {
  const isViewer = (item: MemberListItem) =>
    item.kind === 'MEMBER' &&
    (item.member.id === viewer.membershipId || item.member.userId === viewer.userId)

  const columns: ColumnDefinition<MemberListItem>[] = [
    {
      key: 'person',
      label: 'Pessoa',
      render: (item) => (
        <span className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            {person(item).name}
            {isViewer(item) && <span className="font-normal text-slate-600"> (você)</span>}
          </span>
          <span className="text-[13px] text-slate-600">{person(item).email}</span>
        </span>
      ),
    },
    {
      key: 'role',
      label: 'Perfil de acesso',
      render: (item) => <span className="text-sm">{ROLE_LABELS[person(item).role]}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) =>
        item.kind === 'MEMBER' ? (
          <StatusBadge label="Ativo" variant="success" />
        ) : (
          <StatusBadge label="Convite pendente" variant="warning" />
        ),
    },
    {
      key: 'actions',
      label: 'Ações',
      align: 'right',
      render: (item) => {
        if (item.kind === 'INVITATION') {
          if (item.invitation.status !== 'PENDING') return null
          const copying = copyingInvitationId === item.invitation.id
          return (
            <span className="flex flex-wrap justify-end gap-2">
              <TableActionButton
                label={copying ? 'Copiando...' : 'Copiar link'}
                disabled={copyingInvitationId !== null}
                onClick={() => onCopyInvitationLink(item.invitation)}
              />
              <TableActionButton
                label="Gerenciar convite"
                disabled={copying}
                onClick={() => onManageInvitation(item.invitation)}
              />
            </span>
          )
        }
        if (item.member.role === 'OWNER')
          return <span className="text-sm text-slate-500">Proprietário da empresa</span>
        if (!canManageMember(item.member, viewer)) return null
        return <TableActionButton label="Gerenciar" onClick={() => onManage(item.member)} />
      },
    },
  ]

  const entityLabel = peopleCount === 1 ? 'membro' : 'pessoas'

  // Cartão próprio, como o do Dashboard: título, linhas, paginação e rodapé com o mesmo recuo.
  return (
    <section
      aria-labelledby="member-table-title"
      className="flex flex-col rounded-xl border border-sage-300 bg-white pt-6"
    >
      <div className="px-6">
        <h2 id="member-table-title" className="text-[18px] font-medium text-slate-900">
          Pessoas com acesso
        </h2>
        <p aria-live="polite" className="mt-1 text-[12px] text-slate-600">
          {`${peopleCount} ${entityLabel} · Gestão exclusiva do proprietário`}
        </p>
      </div>
      <div className="px-6">
        <Table
          compact
          entityLabel={entityLabel}
          columns={columns}
          data={items}
          pagination={pagination}
          emptyMessage="Nenhuma pessoa encontrada."
        />
      </div>
      {footer && <div className="px-6 pb-6">{footer}</div>}
    </section>
  )
}
