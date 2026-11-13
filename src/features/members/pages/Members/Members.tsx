import { useCallback, useMemo, useState } from 'react'
import { useSession } from '@/features/auth'
import { Button } from '@/shared/components/Button'
import { MEMBERS_PAGE_SIZE } from '../../api/members'
import { ManageMemberDialog } from '../../components/ManageMemberDialog'
import { MemberTable } from '../../components/MemberTable'
import { useManageMember } from '../../hooks/useManageMember'
import type { MemberActionOutcome } from '../../hooks/useManageMember'
import { useMemberList } from '../../hooks/useMemberList'
import { canManageMembers } from '../../model/permissions'
import type { MemberViewer } from '../../model/permissions'
import type { Member } from '../../schemas/members'

function PageHeader() {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold text-slate-900">Membros</h1>
      <p className="text-xs text-slate-500">
        Gerencie quem acessa a conta da empresa e o perfil de acesso de cada pessoa.
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
      <PageHeader />
      {canManageMembers(user) && user?.companyId && viewer ? (
        <MemberManagement companyId={user.companyId} viewer={viewer} />
      ) : (
        <section className="rounded-lg border border-sage-300 bg-white p-6 text-sm text-slate-700">
          <p>A gestão de membros é exclusiva do proprietário da empresa.</p>
          <p className="mt-1 text-slate-500">
            Para alterar o seu perfil de acesso, fale com o proprietário.
          </p>
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

  return (
    <>
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
    </>
  )
}
