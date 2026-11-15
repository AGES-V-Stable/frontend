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
  /** Próximo passo para quem também não tem os códigos de recuperação (ex.: pedir ajuda ao admin) */
  onMissingRecoveryCodes?: () => void
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

/** Só para exibição: separa a chave em blocos de 4 para facilitar a digitação manual. */
function groupSecret(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(' ') ?? secret
}

/** Passo numerado da ativação: o número é visual; o leitor de tela ouve "Passo N:". */
function StepLine({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-sm text-slate-900">
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800"
      >
        {number}
      </span>
      <span>
        <span className="sr-only">Passo {number}: </span>
        {children}
      </span>
    </p>
  )
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
  onMissingRecoveryCodes,
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
  const [showSecret, setShowSecret] = useState(false)
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
      className={`@container rounded-xl border border-sage-300 bg-white p-6 shadow-xs ${className}`}
      data-testid="two-factor-auth-container"
    >
      {/* O cabeçalho só é exibido fora do modo de recuperação */}
      {!isRecoveryMode && (title || description) && (
        <div
          className={`flex flex-col gap-1 ${title ? 'mb-6 border-b border-sage-200 pb-4' : 'mb-4'}`}
        >
          {title && <h2 className="text-base font-bold text-slate-900">{title}</h2>}
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
      )}

      <div
        className={
          showQrSection
            ? // As colunas dependem da largura do cartão, não da janela: no Login (560px) fica uma só.
              'grid grid-cols-1 items-start gap-6 @2xl:grid-cols-2 @2xl:gap-8'
            : onBack
              ? 'mx-auto flex w-full max-w-[480px] flex-col'
              : 'mx-auto flex w-full max-w-[420px] flex-col'
        }
      >
        {/* LADO ESQUERDO: QR CODE E INSTRUÇÕES (QUANDO OTPAUTH_URI ESTIVER PRESENTE) */}
        {showQrSection && (
          <section
            aria-label="Configuração do aplicativo autenticador"
            className="flex flex-col items-center gap-4 text-center @2xl:items-start @2xl:border-r @2xl:border-sage-200 @2xl:pr-8 @2xl:text-left"
          >
            <StepLine number={1}>Escaneie o QR Code com seu app autenticador.</StepLine>

            <div className="rounded-xl border border-sage-300 bg-white p-3 shadow-xs">
              <QRCodeSVG
                value={otpauthUri!}
                size={180}
                level="M"
                aria-label="QR Code para configuração de dois fatores"
              />
            </div>

            {effectiveSecret && (
              <div className="flex w-full flex-col items-center gap-2 @2xl:items-start">
                <button
                  type="button"
                  onClick={() => setShowSecret((open) => !open)}
                  aria-expanded={showSecret}
                  aria-controls="two-factor-secret"
                  className="text-sm text-slate-600 underline underline-offset-2 transition-colors hover:text-primary cursor-pointer"
                >
                  Não consegue escanear?
                </button>
                {showSecret && (
                  <div
                    id="two-factor-secret"
                    className="flex w-full flex-col gap-1.5 rounded-lg bg-slate-50 p-3 text-left text-sm"
                  >
                    <span className="text-slate-600">Digite esta chave no app:</span>
                    <div className="flex items-center justify-between gap-2 rounded-md border border-sage-300 bg-white px-2.5 py-1.5">
                      <code className="min-w-0 select-all break-words font-mono text-xs font-semibold tracking-wider text-slate-900">
                        {groupSecret(effectiveSecret)}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="shrink-0 text-xs font-semibold text-primary transition-colors hover:text-primary-hover hover:underline cursor-pointer"
                        aria-label="Copiar chave secreta"
                      >
                        {copied ? '✓ Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                )}
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
            <p className="text-sm text-slate-600">
              Use um dos códigos de recuperação que você salvou ao ativar o 2FA.
            </p>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="recovery-code-input"
                    className="text-xs font-medium text-slate-700"
                  >
                    Código de recuperação
                  </label>
                  <span className="text-xs font-mono text-slate-500">
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
                  className={`h-12 w-full rounded-lg border bg-surface px-4 text-center font-mono text-base uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
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

              <div
                className={`flex flex-wrap gap-3 ${onMissingRecoveryCodes ? 'justify-between' : 'justify-center'}`}
              >
                {onMissingRecoveryCodes && (
                  <button
                    type="button"
                    onClick={onMissingRecoveryCodes}
                    disabled={isBusy}
                    className="text-sm font-medium text-primary underline underline-offset-2 hover:text-primary-hover cursor-pointer"
                  >
                    Não tenho os códigos
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSwitchToTotp}
                  disabled={isBusy}
                  className="text-sm font-medium text-slate-600 underline underline-offset-2 hover:text-primary cursor-pointer"
                >
                  Usar o autenticador
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section
            aria-label="Verificação do código de 6 dígitos"
            className="flex flex-col gap-4 w-full"
          >
            {/* Sem QR Code, a descrição do cartão já diz o que fazer. */}
            {showQrSection && <StepLine number={2}>Digite o código que o app mostrar.</StepLine>}

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
                  className={`h-12 w-full rounded-lg border bg-surface px-4 text-center font-mono text-xl tracking-[0.3em] placeholder:tracking-normal placeholder:text-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    error ? 'border-red-700' : 'border-sage-300'
                  }`}
                />

                {/* TIMER REGRESSIVO DE 30 SEGUNDOS (CICLO TOTP RFC 6238) */}
                <div
                  role="timer"
                  aria-label={`Novo código em ${secondsLeft} segundos`}
                  className="flex flex-col gap-1.5 pt-1"
                >
                  <div className="flex items-center justify-between text-sm">
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
                  className="text-sm font-medium text-primary underline underline-offset-2 hover:text-primary-hover transition-colors text-center cursor-pointer"
                >
                  Não consigo usar o autenticador
                </button>
              )}
            </form>
          </section>
        )}
      </div>
    </div>
  )
}
