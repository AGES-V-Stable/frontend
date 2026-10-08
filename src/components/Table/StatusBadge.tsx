export type StatusVariant = 'success' | 'warning' | 'error' | 'info'

interface StatusBadgeProps {
  label: string
  variant?: StatusVariant
}

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  const baseClasses =
    'inline-flex items-center justify-center min-w-[140px] h-[32px] rounded-2xl px-[12px] whitespace-nowrap'
  const textClasses = "font-['IBM_Plex_Sans'] font-bold text-[14px] leading-none"

  const variants = {
    success: 'bg-emerald-50 text-primary',
    warning: 'bg-amber-50 text-amber-700',
    error: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
  }

  const inferVariant = (labelText: string): StatusVariant => {
    const text = labelText.toLowerCase()
    if (
      text.includes('processando') ||
      text.includes('auditoria') ||
      text.includes('pendente') ||
      text.includes('aguardando') ||
      text.includes('retida')
    )
      return 'warning'
    if (
      text.includes('falha') ||
      text.includes('erro') ||
      text.includes('cancelad') ||
      text.includes('rejeitad') ||
      text.includes('expirad')
    )
      return 'error'
    if (text.includes('info') || text.includes('análise')) return 'info'
    return 'success'
  }

  const activeVariant = variant || inferVariant(label)

  return (
    <div className={`${baseClasses} ${variants[activeVariant]}`}>
      <span className={textClasses}>{label}</span>
    </div>
  )
}
