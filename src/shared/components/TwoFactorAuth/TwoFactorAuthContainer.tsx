import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/shared/components/Button'

export interface TwoFactorAuthContainerProps {
  /** Se deve exibir a seção com QR Code e chave manual (padrão: Boolean(otpauthUri)) */
  showQrCode?: boolean
  /** URI otpauth padrão (ex: otpauth://totp/V-Stable:email?secret=...) */
  otpauthUri?: string
  /** Chave secreta Base32 para configuração manual (opcional se puder ser extraída de otpauthUri) */
  secret?: string
  /** Valor controlado do código de 6 dígitos */
  value?: string
  /** Callback ao alterar o código de 6 dígitos */
  onChange?: (code: string) => void
  /** Callback ao clicar em verificar ou submeter com 6 dígitos */
  onVerify?: (code: string) => void
  /** Permite alternar para modo de recuperação (padrão: true quando não há otpauthUri) */
  allowRecovery?: boolean
  /** Callback ao submeter o código de recuperação */
  onVerifyRecovery?: (recoveryCode: string) => void
  /** Notifica alterações no modo de recuperação (true = modo emergência, false = modo TOTP) */
  onRecoveryModeChange?: (isRecovery: boolean) => void
  /** Mensagem de erro de código inválido ou expirado */
  error?: string
  /** Indica se a operação está em processamento */
  loading?: boolean
  /** Texto exibido no botão durante loading (padrão: "Verificando...") */
  loadingLabel?: string
  /** Desabilita campos e botões */
  disabled?: boolean
  /** Texto do botão de confirmação (padrão: "Verificar código") */
  submitLabel?: string
  /** Texto do botão de confirmação no modo de recuperação */
  submitRecoveryLabel?: string
  /** Ação de voltar opcional (ex: voltar para etapa anterior) */
  onBack?: () => void
  /** Rótulo do botão de voltar (padrão: "Voltar") */
  backLabel?: string
  /** Título principal do container */
  title?: string
  /** Descrição introdutória */
  description?: string
  /** Classes CSS adicionais */
  className?: string
}

function extractSecret(uri?: string): string | undefined {
  if (!uri) return undefined
  try {
    const parsed = new URL(uri)
    return parsed.searchParams.get('secret') || undefined
  } catch {
    const match = uri.match(/[?&]secret=([^&]+)/i)
    return match ? decodeURIComponent(match[1]) : undefined
  }
}

/** Calcula o estado exato e sincronizado do ciclo TOTP de 30 segundos (RFC 6238) */
function getTotpCycleState() {
  const now = Date.now()
  const remainingMs = 30000 - (now % 30000)
  const secondsLeft = Math.ceil(remainingMs / 1000)
  const percent = (remainingMs / 30000) * 100
  return {
    secondsLeft: secondsLeft <= 0 ? 30 : secondsLeft,
    percent: Math.max(0, Math.min(100, percent)),
  }
}

export function TwoFactorAuthContainer({
  showQrCode,
  otpauthUri,
  secret,
  value,
  onChange,
  onVerify,
  allowRecovery,
  onVerifyRecovery,
  onRecoveryModeChange,
  error,
  loading = false,
  loadingLabel,
  disabled = false,
  submitLabel = 'Verificar código',
  submitRecoveryLabel,
  onBack,
  backLabel = 'Voltar',
  title,
  description,
  className = '',
}: TwoFactorAuthContainerProps) {
  const [internalCode, setInternalCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState('')
  const [timerState, setTimerState] = useState(getTotpCycleState)

  const isControlled = value !== undefined
  const currentCode = isControlled ? value : internalCode

  const effectiveSecret = secret || extractSecret(otpauthUri)
  const isBusy = loading || disabled
  const canVerify = currentCode.length === 6 && !isBusy

  const cleanRecovery = recoveryCode.trim()
  const rawAlphanumeric = cleanRecovery.replace(/[^A-Z0-9]/g, '')
  const canVerifyRecovery = rawAlphanumeric.length === 8 && !isBusy

  const canAllowRecovery = allowRecovery ?? !otpauthUri

  useEffect(() => {
    if (isRecoveryMode) return

    const updateTimer = () => {
      setTimerState(getTotpCycleState())
    }

    updateTimer()
    const interval = setInterval(updateTimer, 100)
    return () => clearInterval(interval)
  }, [isRecoveryMode])

  function handleCodeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 6)
    if (!isControlled) {
      setInternalCode(digitsOnly)
    }
    onChange?.(digitsOnly)
  }

  function handleRecoveryChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value.toUpperCase()
    const hasHyphen = raw.includes('-')
    // Limite estrito de 8 caracteres alfanuméricos (ou 9 incluindo o hífen, ex: ABCD-1234)
    const formatted = raw.replace(/[^A-Z0-9-]/g, '').slice(0, hasHyphen ? 9 : 8)
    setRecoveryCode(formatted)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && canVerify) {
      event.preventDefault()
      onVerify?.(currentCode)
    }
  }

  function handleRecoveryKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && canVerifyRecovery) {
      event.preventDefault()
      onVerifyRecovery?.(cleanRecovery)
    }
  }

  function handleSwitchToRecovery() {
    setIsRecoveryMode(true)
    setRecoveryCode('')
    onRecoveryModeChange?.(true)
  }

  function handleSwitchToTotp() {
    setIsRecoveryMode(false)
    setRecoveryCode('')
    onRecoveryModeChange?.(false)
  }

  async function handleCopySecret() {
    if (!effectiveSecret) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(effectiveSecret)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback gracioso
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (isRecoveryMode) {
      if (canVerifyRecovery) {
        onVerifyRecovery?.(cleanRecovery)
      }
      return
    }
    if (canVerify) {
      onVerify?.(currentCode)
    }
  }

  const showQrSection = (showQrCode ?? Boolean(otpauthUri)) && !isRecoveryMode
  const secondsLeft = timerState.secondsLeft
  const progressPercent = timerState.percent
  const isExpiringSoon = secondsLeft <= 5

  return (
    <div
      className={`rounded-xl border border-sage-300 bg-white p-6 shadow-xs ${className}`}
      data-testid="two-factor-auth-container"
    >
      {/* O cabeçalho só é exibido fora do modo de recuperação */}
      {!isRecoveryMode && (title || description) && (
        <div className="mb-6 flex flex-col gap-1 border-b border-sage-200 pb-4">
          {title && <h2 className="text-base font-bold text-slate-900">{title}</h2>}
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
      )}

      <div
        className={
          showQrSection
            ? 'grid grid-cols-1 items-start gap-8 md:grid-cols-2'
            : onBack
              ? 'mx-auto flex w-full max-w-[480px] flex-col'
              : 'mx-auto flex w-full max-w-[420px] flex-col'
        }
      >
        {/* LADO ESQUERDO: QR CODE E INSTRUÇÕES (QUANDO OTPAUTH_URI ESTIVER PRESENTE) */}
        {showQrSection && (
          <section
            aria-label="Configuração do aplicativo autenticador"
            className="flex flex-col items-center gap-4 text-center md:items-start md:border-r md:border-sage-200 md:pr-8 md:text-left"
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Passo 1
              </span>
              <h3 className="text-sm font-bold text-slate-900">Escanear código de autenticação</h3>
              <p className="text-xs text-slate-500">
                Abra o <strong>Google Authenticator</strong>,{' '}
                <strong>Microsoft Authenticator</strong> ou outro app compatível no seu celular e
                escaneie o QR Code abaixo:
              </p>
            </div>

            <div className="rounded-xl border border-sage-300 bg-white p-3 shadow-xs">
              <QRCodeSVG
                value={otpauthUri!}
                size={180}
                level="M"
                aria-label="QR Code para configuração de dois fatores"
              />
            </div>

            {effectiveSecret && (
              <div className="flex w-full flex-col gap-1.5 rounded-lg bg-slate-50 p-3 text-xs">
                <span className="font-medium text-slate-600">Não consegue escanear?</span>
                <span className="text-slate-500">
                  Adicione a conta manualmente utilizando esta chave secreta:
                </span>
                <div className="flex items-center justify-between gap-2 rounded-md border border-sage-300 bg-white px-2.5 py-1.5">
                  <code className="select-all font-mono text-[11px] font-semibold tracking-wider text-slate-900">
                    {effectiveSecret}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="shrink-0 text-[11px] font-semibold text-primary transition-colors hover:text-primary-hover hover:underline cursor-pointer"
                    aria-label="Copiar chave secreta"
                  >
                    {copied ? '✓ Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* LADO DIREITO (OU CENTRALIZADO): MODO NORMAL OU MODO DE RECUPERAÇÃO */}
        {isRecoveryMode ? (
          <section
            aria-label="Código de recuperação de emergência"
            className="flex flex-col gap-4 w-full"
          >
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-slate-900">
                Código de recuperação de emergência
              </h3>
              <p className="text-xs text-slate-500">
                Insira um dos códigos de backup gerados para acessar sua conta sem o aplicativo
                autenticador:
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="recovery-code-input"
                    className="text-xs font-medium text-slate-700"
                  >
                    Código de recuperação
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {rawAlphanumeric.length}/8 dígitos
                  </span>
                </div>
                <input
                  id="recovery-code-input"
                  data-testid="recovery-code-input"
                  type="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={9}
                  disabled={isBusy}
                  value={recoveryCode}
                  onChange={handleRecoveryChange}
                  onKeyDown={handleRecoveryKeyDown}
                  placeholder="ex: ABCD-1234"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'recovery-error' : undefined}
                  className={`h-12 w-full rounded-lg border bg-surface px-4 text-center font-mono text-base uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    error ? 'border-red-700' : 'border-sage-300'
                  }`}
                />

                {error && (
                  <p id="recovery-error" role="alert" className="text-xs text-red-700">
                    {error}
                  </p>
                )}
              </div>

              {onBack ? (
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <div className="w-full sm:w-[200px]">
                    <Button
                      type="button"
                      variant="secondary"
                      label={backLabel}
                      onClick={onBack}
                      disabled={isBusy}
                      className="h-12 w-full font-medium"
                    />
                  </div>
                  <div className="w-full sm:w-[240px]">
                    <Button
                      type="submit"
                      variant="primary"
                      label={
                        loading
                          ? loadingLabel || 'Verificando...'
                          : submitRecoveryLabel || 'Verificar código de recuperação'
                      }
                      disabled={!canVerifyRecovery}
                      className="h-12 w-full font-medium"
                    />
                  </div>
                </div>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  label={
                    loading
                      ? loadingLabel || 'Verificando...'
                      : submitRecoveryLabel || 'Verificar código de recuperação'
                  }
                  disabled={!canVerifyRecovery}
                  className="h-12 w-full font-medium"
                />
              )}

              <button
                type="button"
                onClick={handleSwitchToTotp}
                disabled={isBusy}
                className="text-xs font-medium text-primary hover:text-primary-hover hover:underline transition-colors text-center cursor-pointer -mt-1"
              >
                Voltar para código do autenticador
              </button>
            </form>
          </section>
        ) : (
          <section
            aria-label="Verificação do código de 6 dígitos"
            className="flex flex-col gap-4 w-full"
          >
            <div className="flex flex-col gap-1">
              {showQrSection && (
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Passo 2
                </span>
              )}
              <h3 className="text-sm font-bold text-slate-900">Inserir código de verificação</h3>
              <p className="text-xs text-slate-500">
                Digite o código de 6 dígitos gerado pelo aplicativo autenticador:
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="two-factor-code-input" className="sr-only">
                  Código de autenticação
                </label>
                <input
                  id="two-factor-code-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  disabled={isBusy}
                  value={currentCode}
                  onChange={handleCodeChange}
                  onKeyDown={handleKeyDown}
                  placeholder="000000"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'two-factor-error' : undefined}
                  className={`h-12 w-full rounded-lg border bg-surface px-4 text-center font-mono text-xl tracking-[0.3em] placeholder:tracking-normal placeholder:text-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    error ? 'border-red-700' : 'border-sage-300'
                  }`}
                />

                {/* TIMER REGRESSIVO DE 30 SEGUNDOS (CICLO TOTP RFC 6238) */}
                <div
                  role="timer"
                  aria-label={`Novo código em ${secondsLeft} segundos`}
                  className="flex flex-col gap-1.5 pt-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={isExpiringSoon ? 'font-medium text-red-600' : 'text-slate-500'}
                    >
                      {isExpiringSoon ? 'Código expirando...' : 'Novo código em'}
                    </span>
                    <span
                      className={`font-mono font-semibold ${
                        isExpiringSoon ? 'text-red-600' : 'text-slate-700'
                      }`}
                    >
                      {secondsLeft}s
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      data-testid="totp-timer-progress"
                      className={`h-full ${
                        progressPercent > 98
                          ? 'transition-none'
                          : 'transition-[width] duration-100 ease-linear'
                      } ${isExpiringSoon ? 'bg-red-600' : 'bg-primary'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {error && (
                  <p id="two-factor-error" role="alert" className="text-xs text-red-700">
                    {error}
                  </p>
                )}
              </div>

              {onBack ? (
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <div className="w-full sm:w-[200px]">
                    <Button
                      type="button"
                      variant="secondary"
                      label={backLabel}
                      onClick={onBack}
                      disabled={isBusy}
                      className="h-12 w-full font-medium"
                    />
                  </div>
                  <div className="w-full sm:w-[240px]">
                    <Button
                      type="submit"
                      variant="primary"
                      label={loading ? loadingLabel || 'Verificando...' : submitLabel}
                      disabled={!canVerify}
                      className="h-12 w-full font-medium"
                    />
                  </div>
                </div>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  label={loading ? loadingLabel || 'Verificando...' : submitLabel}
                  disabled={!canVerify}
                  className="h-12 w-full font-medium"
                />
              )}

              {canAllowRecovery && (
                <button
                  type="button"
                  onClick={handleSwitchToRecovery}
                  disabled={isBusy}
                  className="text-xs font-medium text-primary hover:text-primary-hover hover:underline transition-colors text-center cursor-pointer -mt-1"
                >
                  Perdi meu celular / Usar código de recuperação
                </button>
              )}
            </form>
          </section>
        )}
      </div>
    </div>
  )
}
