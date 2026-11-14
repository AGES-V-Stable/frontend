import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from '@/features/auth'
import { Button } from '@/shared/components/Button'
import { getOwnMember, MEMBERS_PAGE_SIZE } from '../../api/members'
import { InviteMemberDialog } from '../../components/InviteMemberDialog'
import { ManageInvitationDialog } from '../../components/ManageInvitationDialog'
import { ManageMemberDialog } from '../../components/ManageMemberDialog'
import { MemberTable } from '../../components/MemberTable'
import { useInvitationActions } from '../../hooks/useInvitationActions'
import { useInviteMember } from '../../hooks/useInviteMember'
import { useManageMember } from '../../hooks/useManageMember'
import type { MemberActionOutcome } from '../../hooks/useManageMember'
import { useMemberList } from '../../hooks/useMemberList'
import { canManageMembers, ROLE_LABELS } from '../../model/permissions'
import type { MemberViewer } from '../../model/permissions'
import type { Member } from '../../schemas/members'

/** Exibe somente o vínculo do próprio usuário, sem consultar a lista privada do OWNER. */
function OwnMemberAccess({ companyId }: { companyId: string }) {
  const { company } = useSession()
  const [revision, setRevision] = useState(0)
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    getOwnMember(companyId, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return
        setMember(value)
        setError(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setMember(null)
        setError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [companyId, revision])

  const reload = () => {
    setMember(null)
    setError(false)
    setLoading(true)
    setRevision((current) => current + 1)
  }

  return (
    <section className="rounded-lg border border-sage-300 bg-white p-6 text-sm text-slate-700">
      <h2 className="text-lg font-semibold text-slate-900">Seu acesso à empresa</h2>
      {loading && <p role="status" className="mt-3">Carregando seu acesso...</p>}
      {!loading && error && (
        <div className="mt-3 flex flex-col items-start gap-3">
          <p role="alert">Não foi possível consultar seu vínculo com a empresa.</p>
          <Button
            type="button"
            label="Tentar novamente"
            variant="secondary"
            onClick={reload}
            className="!w-auto"
          />
        </div>
      )}
      {!loading && member && (
        <>
          {member.status === 'REMOVED' ? (
            <p role="alert" className="mt-3 text-red-700">
              Seu acesso a esta empresa foi removido. Entre em contato com o proprietário.
            </p>
          ) : (
            <p className="mt-3">Você está acessando como membro desta empresa.</p>
          )}
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="font-medium">Nome</dt>
              <dd>{member.name}</dd>
            </div>
            <div>
              <dt className="font-medium">E-mail</dt>
              <dd>{member.email}</dd>
            </div>
            <div>
              <dt className="font-medium">Empresa</dt>
              <dd>{company?.tradeName || company?.legalName || 'Empresa vinculada'}</dd>
            </div>
            <div>
              <dt className="font-medium">Perfil</dt>
              <dd>{ROLE_LABELS[member.role]}</dd>
            </div>
            <div>
              <dt className="font-medium">Status</dt>
              <dd>{member.status === 'ACTIVE' ? 'Ativo' : 'Acesso removido'}</dd>
            </div>
          </dl>
          <p className="mt-4 text-slate-500">
            Para alterar o seu perfil de acesso, fale com o proprietário.
          </p>
        </>
      )}
    </section>
  )
}

function PageHeader({ owner }: { owner: boolean }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold text-slate-900">Membros</h1>
      <p className="text-xs text-slate-500">
        {owner
          ? 'Gerencie quem acessa a conta da empresa e o perfil de acesso de cada pessoa.'
          : 'Consulte seu perfil e o estado do seu vínculo empresarial.'}
      </p>
    </header>
  )
}

export function Members() {
  const { user } = useSession()
  const access = user?.companyAccess
  const viewer = useMemo<MemberViewer | null>(
    () => (user && access ? { userId: user.id, membershipId: access.membershipId } : null),
    [user, access],
  )
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-8 md:px-8">
      <PageHeader owner={canManageMembers(user)} />
      {canManageMembers(user) && user?.companyId && viewer ? (
        <MemberManagement companyId={user.companyId} viewer={viewer} />
      ) : access?.companyId ? (
        <OwnMemberAccess key={access.companyId} companyId={access.companyId} />
      ) : (
        <section role="alert" className="rounded-lg border border-sage-300 bg-white p-6 text-sm text-slate-700">
          Não existe vínculo empresarial para esta conta.
        </section>
      )}
    </div>
  )
}

function MemberManagement({ companyId, viewer }: { companyId: string; viewer: MemberViewer }) {
  const { data, loading, failed, page, setPage, reload } = useMemberList(companyId)
  const [selected, setSelected] = useState<Member | null>(null)
  const [outcome, setOutcome] = useState<MemberActionOutcome | null>(null)

  const handleSettled = useCallback(
    (result: MemberActionOutcome) => {
      setSelected(null)
      setOutcome(result)
      reload()
    },
    [reload],
  )
  const { pending, error, save, remove, reset } = useManageMember(companyId, viewer, handleSettled)

  const open = (member: Member) => {
    reset()
    setOutcome(null)
    setSelected(member)
  }
  const close = () => {
    reset()
    setSelected(null)
  }

  const [inviting, setInviting] = useState(false)
  const invite = useInviteMember(companyId, reload)
  const invitations = useInvitationActions(companyId, setOutcome, reload)
  const openInvite = () => {
    invite.reset()
    setOutcome(null)
    setInviting(true)
  }
  const closeInvite = () => {
    // Fechar não revoga o convite criado; o link é descartado da memória.
    invite.reset()
    setInviting(false)
  }

  return (
    <>
      <div className="flex justify-end">
        <Button
          type="button"
          label="Adicionar membro"
          onClick={openInvite}
          className="sm:!w-auto"
        />
      </div>

      {outcome && (
        <div
          role={outcome.tone === 'success' ? 'status' : 'alert'}
          className={`rounded-lg border p-4 text-sm font-medium ${
            outcome.tone === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-amber-300 bg-amber-50 text-amber-800'
          }`}
        >
          {outcome.message}
        </div>
      )}

      {failed && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-700">Não foi possível carregar os membros da empresa.</p>
          <Button
            type="button"
            variant="secondary"
            label="Tentar novamente"
            onClick={reload}
            className="!w-auto"
          />
        </div>
      )}

      {loading && (
        <p role="status" className="text-sm text-slate-500">
          {data ? 'Atualizando membros...' : 'Carregando membros...'}
        </p>
      )}

      {data && (
        <MemberTable
          items={data.items}
          peopleCount={data.summary.peopleCount}
          viewer={viewer}
          onManage={open}
          onCopyInvitationLink={(invitation) => {
            setOutcome(null)
            void invitations.copyFromRow(invitation)
          }}
          onManageInvitation={(invitation) => {
            setOutcome(null)
            invitations.open(invitation)
          }}
          copyingInvitationId={
            invitations.pending?.action === 'link' ? invitations.pending.invitationId : null
          }
          pagination={
            data.totalPages > 1
              ? {
                  currentPage: page + 1,
                  totalPages: data.totalPages,
                  displayedRecords: data.items.length,
                  itemsPerPage: MEMBERS_PAGE_SIZE,
                  totalRecords: data.totalElements,
                  onPageChange: (next) => setPage(next - 1),
                  entityLabel: 'pessoas',
                }
              : undefined
          }
        />
      )}

      {selected && (
        <ManageMemberDialog
          member={selected}
          pending={pending}
          error={error}
          onSave={(role) => void save(selected, role)}
          onRemove={() => void remove(selected)}
          onClose={close}
        />
      )}

      {inviting && (
        <InviteMemberDialog
          pending={invite.pending}
          failure={invite.failure}
          result={invite.result}
          onSubmit={(form) => void invite.submit(form)}
          onEmailEdit={invite.clearFailure}
          onClose={closeInvite}
        />
      )}

      {invitations.active && (
        <ManageInvitationDialog
          key={invitations.active.invitation.id}
          invitation={invitations.active.invitation}
          inviteUrl={invitations.active.inviteUrl}
          notice={invitations.active.notice}
          pending={invitations.pending?.action ?? null}
          error={invitations.error}
          onRegenerate={invitations.regenerate}
          onRevoke={() => void invitations.revoke()}
          onClearError={invitations.clearError}
          onClose={invitations.close}
        />
      )}
    </>
  )
}
