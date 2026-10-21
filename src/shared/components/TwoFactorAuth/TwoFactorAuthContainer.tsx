import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/shared/components/Button'

export interface TwoFactorAuthContainerProps {
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
  /** Mensagem de erro de código inválido ou expirado */
  error?: string
  /** Indica se a operação está em processamento */
  loading?: boolean
  /** Desabilita campos e botões */
  disabled?: boolean
  /** Texto do botão de confirmação (padrão: "Verificar código") */
  submitLabel?: string
  /** Título principal do container */
  title?: string
  /** Descrição introdutória */
  description?: string
  /** Se deve focar automaticamente no input de código */
  autoFocus?: boolean
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

export function TwoFactorAuthContainer({
  otpauthUri,
  secret,
  value,
  onChange,
  onVerify,
  error,
  loading = false,
  disabled = false,
  submitLabel = 'Verificar código',
  title,
  description,
  autoFocus = true,
  className = '',
}: TwoFactorAuthContainerProps) {
  const [internalCode, setInternalCode] = useState('')
  const [copied, setCopied] = useState(false)

  const isControlled = value !== undefined
  const currentCode = isControlled ? value : internalCode

  const effectiveSecret = secret || extractSecret(otpauthUri)
  const isBusy = loading || disabled
  const canVerify = currentCode.length === 6 && !isBusy

  function handleCodeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 6)
    if (!isControlled) {
      setInternalCode(digitsOnly)
    }
    onChange?.(digitsOnly)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && canVerify) {
      event.preventDefault()
      onVerify?.(currentCode)
    }
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
    if (canVerify) {
      onVerify?.(currentCode)
    }
  }

  const hasQrSection = Boolean(otpauthUri)

  return (
    <div
      className={`rounded-xl border border-sage-300 bg-white p-6 shadow-xs ${className}`}
      data-testid="two-factor-auth-container"
    >
      {(title || description) && (
        <div className="mb-6 flex flex-col gap-1 border-b border-sage-200 pb-4">
          {title && <h2 className="text-base font-bold text-slate-900">{title}</h2>}
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
      )}

      <div
        className={
          hasQrSection
            ? 'grid grid-cols-1 items-start gap-8 md:grid-cols-2'
            : 'mx-auto flex w-full max-w-[420px] flex-col'
        }
      >
        {/* LADO ESQUERDO: QR CODE E INSTRUÇÕES (QUANDO OTPAUTH_URI ESTIVER PRESENTE) */}
        {hasQrSection && (
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

        {/* LADO DIREITO (OU CENTRALIZADO): INPUT DE 6 DÍGITOS E BOTÃO DE VERIFICAÇÃO */}
        <section
          aria-label="Verificação do código de 6 dígitos"
          className="flex flex-col gap-4 w-full"
        >
          <div className="flex flex-col gap-1">
            {hasQrSection && (
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
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus={autoFocus}
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

              {error && (
                <p id="two-factor-error" role="alert" className="text-xs text-red-700">
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              label={loading ? 'Verificando...' : submitLabel}
              disabled={!canVerify}
              className="h-12 w-full font-medium"
            />
          </form>
        </section>
      </div>
    </div>
  )
}
