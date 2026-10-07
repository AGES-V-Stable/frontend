import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'neutral'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: ButtonVariant
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ label, variant = 'primary', disabled, className = '', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center text-base font-normal rounded-[8px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'

    const paddingStyles = 'px-[24px] py-[12px]'

    const wFullStyle = 'w-full'

    const variants = {
      neutral: 'bg-white border border-sage-300 text-slate-700 hover:bg-slate-50',
      primary:
        'bg-primary text-white hover:bg-primary-hover disabled:hover:bg-primary border border-transparent',
      secondary:
        'bg-transparent border border-primary text-primary hover:bg-primary-hover hover:text-white disabled:hover:bg-transparent disabled:hover:text-primary',
      tertiary:
        'bg-transparent text-primary hover:bg-gray-100 disabled:hover:bg-transparent border border-transparent',
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
