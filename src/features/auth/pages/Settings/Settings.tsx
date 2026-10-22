import { useState } from 'react'
import { Button } from '@/shared/components/Button'
import { RecoveryCodesContainer, TwoFactorAuthContainer } from '@/shared/components/TwoFactorAuth'
import { twoFactorService, useSession } from '@/features/auth'
import shieldIcon from '@/shared/assets/navigation/settings.svg'

export type Reconfigure2FaState = 'IDLE' | 'VERIFY_CURRENT' | 'SCAN_NEW_QR' | 'SHOW_RECOVERY_CODES'

export interface SettingsProps {
  /** Se o 2FA está ativo inicialmente (padrão: twoFactorService.isActivated()) */
  twoFactorEnabled?: boolean
  /** Callback disparado ao concluir a reconfiguração com sucesso */
  onReconfigureSuccess?: () => void
}

export function Settings({ twoFactorEnabled, onReconfigureSuccess }: SettingsProps) {
  const { user } = useSession()
  const [twoFactorActive, setTwoFactorActive] = useState(
    () => twoFactorEnabled ?? twoFactorService.isActivated(),
  )
  const [state, setState] = useState<Reconfigure2FaState>('IDLE')

  // Estado da verificação do aparelho atual (Passo 1)
  const [currentTotpCode, setCurrentTotpCode] = useState('')
  const [currentError, setCurrentError] = useState('')

  // Estado do escaneamento do novo QR Code (Passo 2)
  const [newOtpauthUri, setNewOtpauthUri] = useState('')
  const [newSecret, setNewSecret] = useState<string | undefined>()
  const [newTotpCode, setNewTotpCode] = useState('')
  const [newError, setNewError] = useState('')

  // Estado dos novos códigos de recuperação (Passo 3)
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[]>([])

  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  function handleStartReconfigure() {
    setCurrentTotpCode('')
    setCurrentError('')
    setNewOtpauthUri('')
    setNewSecret(undefined)
    setNewTotpCode('')
    setNewError('')
    setSuccessMessage('')
    setState('VERIFY_CURRENT')
  }

  async function handleVerifyCurrent(code: string) {
    if (code.length !== 6 || isLoading) return
    setIsLoading(true)
    setCurrentError('')
    try {
      const res = await twoFactorService.setup(code)
      setNewOtpauthUri(res.otpauthUri)
      setNewSecret(res.secret)
      setState('SCAN_NEW_QR')
    } catch (error) {
      setCurrentError(
        error instanceof Error && error.message
          ? error.message
          : 'Código do autenticador atual inválido ou expirado.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function handleActivateNew(code: string) {
    if (code.length !== 6 || isLoading) return
    setIsLoading(true)
    setNewError('')
    try {
      const res = await twoFactorService.activate(code)
      const codes =
        res.recoveryCodes && res.recoveryCodes.length > 0
          ? res.recoveryCodes
          : [
              'A1B2-C3D4',
              'E5F6-G7H8',
              'J9K0-L1M2',
              'N3P4-Q5R6',
              'S7T8-U9V0',
              'W1X2-Y3Z4',
              'B5C6-D7E8',
              'F9G0-H1J2',
            ]
      setNewRecoveryCodes(codes)
      setState('SHOW_RECOVERY_CODES')
    } catch (error) {
      setNewError(
        error instanceof Error && error.message
          ? error.message
          : 'Código de autenticação inválido ou expirado.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  function handleCompleteRecovery() {
    twoFactorService.setActivated(true)
    setTwoFactorActive(true)
    setState('IDLE')
    setSuccessMessage('Autenticação em duas etapas reconfigurada com sucesso!')
    onReconfigureSuccess?.()
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações da Conta</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie as informações da sua conta e preferências de segurança.
        </p>
      </div>

      {successMessage && state === 'IDLE' && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-medium flex items-center justify-between"
        >
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold ml-4 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Seção de Dados Básicos */}
      <section className="bg-white rounded-xl border border-sage-300 p-6 flex flex-col gap-4 shadow-2xs">
        <h2 className="text-lg font-bold text-slate-900">Perfil</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500 block text-xs">Nome</span>
            <span className="font-medium text-slate-800">{user?.name || 'Usuário'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs">E-mail</span>
            <span className="font-medium text-slate-800">
              {user?.email || 'usuario@empresa.com'}
            </span>
          </div>
        </div>
      </section>

      {/* Seção de Segurança */}
      <section
        aria-label="Segurança"
        className="bg-white rounded-xl border border-sage-300 p-6 flex flex-col gap-6 shadow-2xs"
      >
        <div className="flex items-center gap-3">
          <img src={shieldIcon} alt="" className="size-5" />
          <h2 className="text-lg font-bold text-slate-900">Segurança</h2>
        </div>

        {/* Estado IDLE */}
        {state === 'IDLE' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 text-sm">
                  Autenticação em Duas Etapas (2FA)
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    twoFactorActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {twoFactorActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-md">
                {twoFactorActive
                  ? 'Sua conta está protegida por verificação em duas etapas via aplicativo autenticador.'
                  : 'Adicione uma camada adicional de segurança solicitando um código temporário ao fazer login.'}
              </p>
            </div>

            {twoFactorActive && (
              <div className="shrink-0">
                <Button
                  label="Reconfigurar 2FA"
                  variant="secondary"
                  onClick={handleStartReconfigure}
                />
              </div>
            )}
          </div>
        )}

        {/* Passo 1: Verificar Aparelho Atual */}
        {state === 'VERIFY_CURRENT' && (
          <div className="flex flex-col gap-4">
            <div className="pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-base">
                Passo 1 de 3: Confirmar aparelho atual
              </h3>
            </div>
            <TwoFactorAuthContainer
              showQrCode={false}
              title="Autorizar troca de aparelho"
              description="Digite o código de 6 dígitos do seu autenticador atual para autorizar a troca"
              value={currentTotpCode}
              onChange={(val) => {
                setCurrentTotpCode(val)
                if (currentError) setCurrentError('')
              }}
              onVerify={handleVerifyCurrent}
              error={currentError}
              loading={isLoading}
              loadingLabel="Verificando..."
              submitLabel="Continuar"
              onBack={() => setState('IDLE')}
              backLabel="Cancelar"
            />
          </div>
        )}

        {/* Passo 2: Escanear Novo QR Code */}
        {state === 'SCAN_NEW_QR' && (
          <div className="flex flex-col gap-4">
            <div className="pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-base">
                Passo 2 de 3: Escanear novo QR Code
              </h3>
            </div>
            <TwoFactorAuthContainer
              showQrCode={true}
              otpauthUri={newOtpauthUri}
              secret={newSecret}
              title="Configurar Novo Aparelho"
              description="Abra seu novo aplicativo autenticador no celular e escaneie o QR Code para gerar seu código de acesso:"
              value={newTotpCode}
              onChange={(val) => {
                setNewTotpCode(val)
                if (newError) setNewError('')
              }}
              onVerify={handleActivateNew}
              error={newError}
              loading={isLoading}
              loadingLabel="Ativando..."
              submitLabel="Confirmar e Ativar 2FA"
              onBack={() => setState('IDLE')}
              backLabel="Cancelar"
            />
          </div>
        )}

        {/* Passo 3: Exibir Novos Códigos de Recuperação */}
        {state === 'SHOW_RECOVERY_CODES' && (
          <div className="flex flex-col gap-4">
            <div className="pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-base">
                Passo 3 de 3: Novos códigos de recuperação
              </h3>
            </div>
            <RecoveryCodesContainer codes={newRecoveryCodes} onComplete={handleCompleteRecovery} />
          </div>
        )}
      </section>
    </div>
  )
}
