interface TableActionButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  /** Nome para leitor de tela quando o rótulo visível se repete em várias linhas. */
  accessibleLabel?: string
}

export function TableActionButton({
  label,
  onClick,
  disabled,
  accessibleLabel,
}: TableActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={accessibleLabel}
      disabled={disabled}
      aria-disabled={disabled}
      className="inline-flex items-center justify-center w-[200px] h-[48px] rounded-lg px-[24px] font-['IBM_Plex_Sans'] font-medium text-[16px] leading-none text-primary hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
    >
      {label}
    </button>
  )
}
