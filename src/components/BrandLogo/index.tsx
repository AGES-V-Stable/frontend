import logo from '@/assets/v-stable-logo.png'

interface BrandLogoProps {
  className?: string
}

export function BrandLogo({ className = '' }: BrandLogoProps) {
  return (
    <img
      src={logo}
      alt="V-Stable"
      width={2045}
      height={769}
      className={'block h-auto max-w-full object-contain ' + className}
    />
  )
}
