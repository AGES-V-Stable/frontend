import type { ReactNode } from 'react'
import type { InvitationFailure } from '../../model/invitationFailure'

const REQUEST_NEW_LINK =
  'Se ainda precisar de acesso, solicite um novo link ao proprietário da empresa.'

const PROBLEMS: Partial<Record<InvitationFailure['kind'], { title: string; description: string }>> =
  {
    INVALID: {
      title: 'Link de convite inválido',
      description: `Não encontramos um convite para este link. Confira se ele foi copiado por completo. ${REQUEST_NEW_LINK}`,
    },
    SUPERSEDED: {
      title: 'Este link foi substituído',
      description: `O proprietário gerou um novo link para este convite e o anterior deixou de valer. ${REQUEST_NEW_LINK}`,
    },
    REVOKED: {
      title: 'Convite revogado',
      description: `Este convite foi cancelado pelo proprietário da empresa. ${REQUEST_NEW_LINK}`,
    },
    ALREADY_USED: {
      title: 'Convite já utilizado',
      description:
        'Este convite já foi aceito e não pode ser usado novamente. Se você já criou o seu acesso, entre com a sua conta.',
    },
    USER_IN_OTHER_COMPANY: {
      title: 'Conta vinculada a outra empresa',
      description:
        'Sua conta já possui vínculo ativo com outra empresa, por isso este convite não pode ser aceito. Fale com o proprietário da empresa que enviou o convite.',
    },
    MEMBER_ALREADY_EXISTS: {
      title: 'Você já faz parte desta empresa',
      description: 'Sua conta já tem acesso a esta empresa. Nenhum novo vínculo foi criado.',
    },
    RATE_LIMITED: {
      title: 'Muitas tentativas',
      description:
        'Recebemos muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.',
    },
  }

const UNAVAILABLE = {
  title: 'Não foi possível carregar o convite',
  description: 'Verifique sua conexão e tente novamente.',
}

/** Motivo pelo qual o convite não pode seguir, com as ações possíveis em cada caso. */
export function InvitationProblem({
  failure,
  children,
}: {
  failure: InvitationFailure
  children: ReactNode
}) {
  const problem = PROBLEMS[failure.kind] ?? UNAVAILABLE
  return (
    <section aria-labelledby="invitation-problem-title" className="flex flex-col gap-4">
      <h1 id="invitation-problem-title" className="text-2xl font-bold text-slate-900">
        {problem.title}
      </h1>
      <p role="alert" className="text-slate-600">
        {problem.description}
      </p>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}
