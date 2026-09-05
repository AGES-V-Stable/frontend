export type StatusVariant = 'success' | 'warning' | 'error' | 'info'

interface StatusBadgeProps {
  label: string
  variant?: StatusVariant
}

export function StatusBadge({ label, variant = 'success' }: StatusBadgeProps) {
  const baseClasses =
    'inline-flex items-center justify-center w-[140px] h-[32px] rounded-2xl px-[12px] whitespace-nowrap'
  const textClasses = "font-['IBM_Plex_Sans'] font-bold text-[14px] leading-none"

  const variants = {
    success: 'bg-[var(--Semantic-Success-Subtle,#ECFDF5)] text-[#059669]',
    warning: 'bg-yellow-100 text-yellow-800', // placeholder
    error: 'bg-red-100 text-red-800', // placeholder
    info: 'bg-blue-100 text-blue-800', // placeholder
  }

  return (
    <div className={`${baseClasses} ${variants[variant] || variants.success}`}>
      <span className={textClasses}>{label}</span>
    </div>
  )
}
