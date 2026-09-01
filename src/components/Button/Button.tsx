import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: ButtonVariant
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ label, variant = 'primary', disabled, className = '', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center text-[16px] font-normal rounded-[8px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#059669] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'

    const paddingStyles = 'px-[24px] py-[12px]'

    
    const wFullStyle = 'w-full'

    
    const variants = {
      primary:
        'bg-[#059669] text-white hover:bg-[#047857] disabled:hover:bg-[#059669] border border-transparent',
      secondary:
        'bg-transparent border border-[#059669] text-[#059669] hover:bg-[#047857] hover:text-white disabled:hover:bg-transparent disabled:hover:text-[#059669]',
      tertiary:
        'bg-transparent text-[#059669] hover:bg-gray-100 disabled:hover:bg-transparent border border-transparent',
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${paddingStyles} ${wFullStyle} ${variants[variant]} ${className}`}
        disabled={disabled}
        aria-disabled={disabled}
        {...props}
      >
        {label}
      </button>
    )
  },
)

Button.displayName = 'Button'
