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
    success: 'bg-[var(--Semantic-Success-Subtle,#ECFDF5)] text-[#059669]',
    warning: 'bg-[#FFFBEB] text-[#B45309]',
    error: 'bg-[#FEF2F2] text-[#B91C1C]',
    info: 'bg-[#EFF6FF] text-[#1D4ED8]',
  }

  const inferVariant = (labelText: string): StatusVariant => {
    const text = labelText.toLowerCase()
    if (text.includes('processando') || text.includes('auditoria') || text.includes('pendente'))
      return 'warning'
    if (text.includes('falha') || text.includes('erro') || text.includes('cancelad')) return 'error'
    if (text.includes('info')) return 'info'
    return 'success'
  }

  const activeVariant = variant || inferVariant(label)

  return (
    <div className={`${baseClasses} ${variants[activeVariant]}`}>
      <span className={textClasses}>{label}</span>
    </div>
  )
}
