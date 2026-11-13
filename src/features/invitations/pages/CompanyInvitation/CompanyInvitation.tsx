import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { clearLoginToken, isStoredAdmin, useSession } from '@/features/auth'
import { Button } from '@/shared/components/Button'
import { PATHS } from '@/shared/navigation/paths'
import logo from '@/shared/assets/navigation/logo.png'
import { useInvitationResolution } from '../../hooks/useInvitationResolution'
import { useInvitationToken } from '../../hooks/useInvitationToken'
import type { InvitationFailure } from '../../model/invitationFailure'
import { clearInvitationToken } from '../../model/invitationToken'
import type { Invitation } from '../../schemas/invitation'
import { ExistingUserAcceptance } from './ExistingUserAcceptance'
import { InvitationProblem } from './InvitationProblem'
import { InvitationSummary } from './InvitationSummary'
import { NewUserAcceptanceForm } from './NewUserAcceptanceForm'

const ACCOUNT_EXISTS_NOTICE =
  'Já existe uma conta com este e-mail. Entre na sua conta para aceitar o convite.'
const TERMS_UPDATED_NOTICE =
  'Os termos de uso foram atualizados. Revise e aceite novamente para continuar.'
const SESSION_EXPIRED_NOTICE = 'Sua sessão expirou. Entre novamente para confirmar o convite.'

const normalizeEmail = (email: string) => email.trim().toLowerCase()

/** Libera "Tentar novamente" somente depois do tempo pedido pelo `Retry-After`. */
function RetryButton({ seconds, onRetry }: { seconds: number; onRetry: () => void }) {
  const [ready, setReady] = useState(seconds <= 0)
  useEffect(() => {
    if (ready) return
    const timer = setTimeout(() => setReady(true), seconds * 1000)
    return () => clearTimeout(timer)
  }, [ready, seconds])
  return <Button type="button" label="Tentar novamente" disabled={!ready} onClick={onRetry} />
}

function InvitationHeader({ invitation }: { invitation: Invitation }) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold text-slate-900">
        Você foi convidado para acessar {invitation.company.name}
      </h1>
      <p className="text-slate-600">
        Confira os dados do convite. Eles foram definidos por quem convidou e não podem ser
        alterados.
      </p>
    </header>
  )
}

/**
 * Rota pública `/convites/empresa#token=<token>`: apresenta o convite e conduz o aceite pelo
 * cadastro do novo usuário ou pelo login normal (com 2FA) da conta convidada.
 */
export function CompanyInvitation() {
  const token = useInvitationToken()
  const { state, reload } = useInvitationResolution(token)
  const session = useSession()
  const navigate = useNavigate()
  const [accountExists, setAccountExists] = useState(false)
  const [outcome, setOutcome] = useState<InvitationFailure | null>(null)
  const [notice, setNotice] = useState('')
  const invitation = state.status === 'ready' ? state.invitation : null
  const authenticated = session.status === 'authenticated'

  /** Encerra o fluxo do convite nesta aba e segue para outro destino. */
  function leave(to: string) {
    clearInvitationToken()
    void navigate(to, { replace: true })
  }

  function loginToConfirm() {
    void navigate(PATHS.LOGIN, {
      state: { from: PATHS.COMPANY_INVITATION, email: invitation?.recipient.email },
    })
  }

  /** Login normal da conta já criada; o convite consumido não é aceito de novo. */
  function loginToCreatedAccount() {
    void navigate(PATHS.LOGIN, {
      replace: true,
      state: { from: PATHS.MEMBERS, email: invitation?.recipient.email },
    })
  }

  function switchAccount() {
    setOutcome(null)
    setNotice('')
    clearLoginToken()
  }

  function openMyAccess() {
    clearInvitationToken()
    session.retry()
    void navigate(PATHS.MEMBERS, { replace: true })
  }

  function handleCreated() {
    clearInvitationToken()
    void navigate(PATHS.LOGIN, {
      replace: true,
      state: { from: PATHS.MEMBERS, email: invitation?.recipient.email, notice: 'ACCOUNT_CREATED' },
    })
  }

  function handleFailure(failure: InvitationFailure) {
    if (failure.kind === 'USER_ALREADY_EXISTS') {
      setAccountExists(true)
      setNotice(ACCOUNT_EXISTS_NOTICE)
    } else if (failure.kind === 'TERMS_VERSION_MISMATCH') {
      setNotice(TERMS_UPDATED_NOTICE)
      reload()
    } else if (failure.kind === 'UNAUTHENTICATED') {
      setNotice(SESSION_EXPIRED_NOTICE)
    } else if (failure.kind === 'IDENTITY_MISMATCH') {
      setOutcome(failure)
    } else {
      clearInvitationToken()
      setOutcome(failure)
    }
  }

  const exitAction = authenticated ? (
    <Button type="button" label="Ir para o início" onClick={() => leave(PATHS.HOME)} />
  ) : (
    <Button type="button" label="Ir para o login" onClick={() => leave(PATHS.LOGIN)} />
  )

  function problemActions(failure: InvitationFailure): ReactNode {
    if (failure.kind === 'MEMBER_ALREADY_EXISTS')
      return <Button type="button" label="Abrir meu acesso" onClick={openMyAccess} />
    if (failure.kind === 'ALREADY_USED' && !authenticated)
      return <Button type="button" label="Entrar na minha conta" onClick={loginToCreatedAccount} />
    if (failure.kind === 'UNAVAILABLE' || failure.kind === 'RATE_LIMITED')
      return (
        <>
          <RetryButton
            seconds={failure.kind === 'RATE_LIMITED' ? failure.retryAfterSeconds : 0}
            onRetry={reload}
          />
          {exitAction}
        </>
      )
    return exitAction
  }

  function content(): ReactNode {
    if (
      outcome?.kind === 'IDENTITY_MISMATCH' ||
      (outcome === null && invitation && isOtherAccount())
    )
      return (
        <section aria-labelledby="invitation-mismatch-title" className="flex flex-col gap-4">
          <h1 id="invitation-mismatch-title" className="text-2xl font-bold text-slate-900">
            {isStoredAdmin()
              ? 'Contas administrativas não aceitam convites'
              : 'Este convite é para outra conta'}
          </h1>
          <p role="alert" className="text-slate-600">
            Você está conectado com uma conta diferente da convidada. Saia desta conta e entre com o
            e-mail que recebeu o convite para continuar.
          </p>
          <Button type="button" label="Trocar de conta" onClick={switchAccount} />
          <Button
            type="button"
            variant="tertiary"
            label="Cancelar"
            onClick={() => leave(PATHS.HOME)}
          />
        </section>
      )
    if (outcome)
      return <InvitationProblem failure={outcome}>{problemActions(outcome)}</InvitationProblem>
    if (state.status === 'failed')
      return (
        <InvitationProblem failure={state.failure}>
          {problemActions(state.failure)}
        </InvitationProblem>
      )
    if (state.status === 'loading' || session.status === 'loading')
      return (
        <p role="status" className="text-slate-600">
          Carregando convite...
        </p>
      )
    if (session.status === 'error')
      return (
        <div className="flex flex-col gap-4">
          <p role="alert" className="text-slate-600">
            Não foi possível carregar os dados da sua conta.
          </p>
          <Button type="button" label="Tentar novamente" onClick={session.retry} />
        </div>
      )
    return (
      <>
        <InvitationHeader invitation={state.invitation} />
        {notice && (
          <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            {notice}
          </p>
        )}
        <InvitationSummary invitation={state.invitation} />
        {token && authenticated && session.user ? (
          <ExistingUserAcceptance
            invitation={state.invitation}
            token={token}
            accountEmail={session.user.email}
            onAccepted={openMyAccess}
            onFailure={handleFailure}
            onSwitchAccount={switchAccount}
          />
        ) : token && state.invitation.acceptanceMode === 'REGISTER' && !accountExists ? (
          <NewUserAcceptanceForm
            invitation={state.invitation}
            token={token}
            onCreated={handleCreated}
            onFailure={handleFailure}
            onCancel={() => leave(PATHS.LOGIN)}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">
              Você já possui uma conta V-Stable com o e-mail{' '}
              <strong className="break-all text-slate-900">
                {state.invitation.recipient.email}
              </strong>
              . Entre com ela para confirmar o vínculo com a empresa.
            </p>
            <Button type="button" label="Entrar na minha conta" onClick={loginToConfirm} />
            <Button
              type="button"
              variant="tertiary"
              label="Cancelar"
              onClick={() => leave(PATHS.LOGIN)}
            />
          </div>
        )}
      </>
    )
  }

  /** Conta autenticada que não é a convidada (ou administrador): não vê nem aceita o convite. */
  function isOtherAccount(): boolean {
    if (!authenticated || !session.user || !invitation) return false
    return (
      isStoredAdmin() ||
      normalizeEmail(session.user.email) !== normalizeEmail(invitation.recipient.email)
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="flex w-full max-w-[560px] flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm sm:p-10">
        <img src={logo} alt="V-Stable" className="h-12 w-auto self-start object-contain" />
        {content()}
      </div>
    </main>
  )
}
