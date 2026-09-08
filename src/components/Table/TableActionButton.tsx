interface TableActionButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
}

export function TableActionButton({ label, onClick, disabled }: TableActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className="inline-flex items-center justify-center w-[200px] h-[48px] rounded-lg px-[24px] font-['IBM_Plex_Sans'] font-medium text-[16px] leading-none text-[#059669] hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
    >
      {label}
    </button>
  )
}
