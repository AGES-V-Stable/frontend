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
            {isViewer(item) && <span className="font-normal text-slate-500"> (você)</span>}
          </span>
          <span className="text-xs text-slate-500">{person(item).email}</span>
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

  return (
    <Table
      compact
      title="Pessoas com acesso"
      totalRecords={peopleCount}
      entityLabel={peopleCount === 1 ? 'pessoa' : 'pessoas'}
      columns={columns}
      data={items}
      pagination={pagination}
      emptyMessage="Nenhuma pessoa encontrada."
    />
  )
}
