import type { ReactNode } from 'react'
import { Button } from '@/shared/components/Button'
import { useOwnMembership } from '../../hooks/useOwnMembership'
import { ROLE_LABELS } from '../../model/permissions'
import type { CompanyRole } from '../../schemas/members'

export interface OwnAccessProps {
  /** Empresa do vínculo (ativo ou removido) informado pela sessão. */
  companyId: string
  /** Nome da empresa já carregado na sessão; ausente quando o vínculo foi removido. */
  companyName: string | null
  /** Perfil informado pela sessão, usado para explicar o que o acesso permite. */
  role: CompanyRole
  /** A sessão já identifica o vínculo como removido. */
  removed: boolean
}

const ROLE_SCOPE: Record<CompanyRole, string> = {
  OWNER: 'Seu perfil permite consultar a conta e realizar operações financeiras autorizadas.',
  OPERATOR: 'Seu perfil permite consultar a conta e realizar operações financeiras autorizadas.',
  VIEWER: 'Seu perfil permite consultar a conta, sem realizar operações financeiras.',
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <dt className="text-sm text-slate-500 sm:w-40 sm:shrink-0">{label}</dt>
      <dd className="text-sm text-slate-900">{children}</dd>
    </div>
  )
}

/** Consulta do próprio vínculo: sem lista de terceiros e sem ações de gestão. */
export function OwnAccess({ companyId, companyName, role, removed }: OwnAccessProps) {
  const { member, loading, failure, reload } = useOwnMembership(companyId)
  const lostAccess = removed || failure === 'revoked' || member?.status === 'REMOVED'

  return (
    <>
      {lostAccess ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-medium text-red-700">Seu acesso a esta empresa foi removido.</p>
          <p className="mt-1 text-slate-700">
            A sua conta pessoal continua ativa. Para voltar a acessar a empresa, peça um novo
            convite ao proprietário.
          </p>
        </div>
      ) : (
        <div className="rounded-lg bg-blue-50 p-4 text-sm">
          <p className="font-medium text-slate-900">Você está acessando como membro</p>
          <p className="mt-1 text-slate-600">
            {ROLE_SCOPE[member?.role ?? role]} A gestão dos membros é exclusiva do proprietário.
          </p>
        </div>
      )}

      {failure === 'failed' && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-700">Não foi possível carregar os dados do seu acesso.</p>
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
          Carregando seu acesso...
        </p>
      )}

      {member && (
        <section
          aria-labelledby="own-access-title"
          className="flex flex-col gap-4 rounded-lg border border-sage-300 bg-white p-6"
        >
          <h2 id="own-access-title" className="text-base font-medium text-slate-900">
            Seu acesso à empresa
          </h2>
          <dl className="flex flex-col gap-4">
            <Detail label="Nome">{member.name}</Detail>
            <Detail label="E-mail">{member.email}</Detail>
            {companyName && !lostAccess && <Detail label="Empresa">{companyName}</Detail>}
            <Detail label="Perfil de acesso">{ROLE_LABELS[member.role]}</Detail>
            <Detail label="Status">{lostAccess ? 'Acesso removido' : 'Ativo'}</Detail>
          </dl>
        </section>
      )}

      {member && !lostAccess && (
        <p className="text-xs text-slate-500">
          Para alterar seu perfil de acesso, entre em contato com o proprietário da empresa.
        </p>
      )}
    </>
  )
}
