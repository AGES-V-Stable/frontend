import { useState } from 'react'
import { Button } from '@/shared/components/Button'

export interface RecoveryCodesContainerProps {
  /** Array com os 8 códigos de emergência retornados pelo backend */
  codes: string[]
  /** Callback disparada ao confirmar e concluir a configuração */
  onComplete: () => void
  /** Título principal opcional */
  title?: string
  /** Descrição introdutória opcional */
  description?: string
  /** Classes CSS adicionais */
  className?: string
}

export function RecoveryCodesContainer({
  codes,
  onComplete,
  title = 'Códigos de recuperação de emergência',
  description = 'Guarde estes códigos em um local seguro. Caso perca seu dispositivo autenticador, eles serão o único meio de acessar sua conta.',
  className = '',
}: RecoveryCodesContainerProps) {
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  async function handleCopy() {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(codes.join('\n'))
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback gracioso
    }
  }

  function handleDownloadTxt() {
    try {
      const fileHeader = [
        '=====================================================',
        '          V-STABLE - CÓDIGOS DE RECUPERAÇÃO          ',
        '=====================================================',
        'IMPORTANTE: Estes códigos são confidenciais e de uso único.',
        'Cada código só pode ser utilizado uma única vez caso você',
        'perca o acesso ao seu aplicativo autenticador (2FA).',
        '',
        'Data de emissão: ' + new Date().toLocaleDateString('pt-BR'),
        '-----------------------------------------------------',
        '',
        ...codes.map((code, idx) => `Código ${idx + 1}: ${code}`),
        '',
        '-----------------------------------------------------',
        'Guarde este arquivo em um gerenciador de senhas ou cofre seguro.',
        '=====================================================',
      ].join('\n')

      const blob = new Blob([fileHeader], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'v-stable-recovery-codes.txt'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setDownloaded(true)
      setTimeout(() => setDownloaded(false), 2500)
    } catch {
      // Fallback gracioso
    }
  }

  return (
    <div
      data-testid="recovery-codes-container"
      className={`flex flex-col gap-6 rounded-xl border border-sage-300 bg-white p-6 shadow-xs ${className}`}
    >
      {/* Cabeçalho */}
      <div className="flex flex-col gap-1 border-b border-sage-200 pb-4 text-left">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{description}</p>
      </div>

      {/* Alerta de Segurança */}
      <div
        role="alert"
        className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900"
      >
        <span className="text-base select-none" aria-hidden="true"></span>
        <div className="flex flex-col gap-0.5">
          <strong className="font-semibold text-amber-950">Aviso importante de segurança:</strong>
          <span>
            Esses códigos só serão exibidos <strong>uma única vez</strong>. Salve-os agora em um
            local seguro antes de continuar.
          </span>
        </div>
      </div>

      {/* Grid de 8 Códigos (2 colunas de 4) */}
      <div
        data-testid="recovery-codes-grid"
        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
        aria-label="Lista de códigos de recuperação"
      >
        {codes.map((code, idx) => (
          <div
            key={code + idx}
            data-testid={`recovery-code-${idx}`}
            className="flex items-center justify-between rounded-lg border border-sage-200 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-semibold tracking-wider text-slate-800 transition-colors select-all hover:bg-slate-100"
          >
            <span className="text-xs text-slate-500 font-sans select-none">{idx + 1}.</span>
            <span className="font-bold text-slate-900">{code}</span>
          </div>
        ))}
      </div>

      {/* Botões de Ação para Salvar Códigos */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="flex h-10 w-full sm:flex-1 items-center justify-center gap-2 rounded-lg border border-sage-300 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
          aria-label="Copiar códigos de recuperação"
        >
          <span>{copied ? '✓' : ''}</span>
          <span>{copied ? 'Copiado!' : 'Copiar códigos'}</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadTxt}
          className="flex h-10 w-full sm:flex-1 items-center justify-center gap-2 rounded-lg border border-sage-300 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
          aria-label="Baixar códigos em arquivo de texto"
        >
          <span>{downloaded ? '✓' : ''}</span>
          <span>{downloaded ? 'Baixado!' : 'Baixar .txt'}</span>
        </button>
      </div>

      {/* Trava de Confirmação Obrigatória */}
      <div className="flex items-start gap-3 rounded-lg border border-sage-200 bg-slate-50/60 p-3.5 text-left">
        <input
          id="confirm-saved-recovery-codes"
          type="checkbox"
          checked={isConfirmed}
          onChange={(e) => setIsConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-sage-300 text-primary accent-primary cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
        />
        <label
          htmlFor="confirm-saved-recovery-codes"
          className="text-xs text-slate-700 leading-relaxed cursor-pointer select-none"
        >
          Confirmo que anotei ou salvei meus códigos em local seguro
        </label>
      </div>

      {/* Botão Final de Conclusão */}
      <Button
        type="button"
        variant="primary"
        label="Concluir Configuração"
        disabled={!isConfirmed}
        onClick={onComplete}
        className="h-12 w-full font-medium"
      />
    </div>
  )
}
