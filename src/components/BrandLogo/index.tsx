import logo from '@/assets/v-stable-logo.svg'

interface BrandLogoProps {
  className?: string
}

export function BrandLogo({ className = '' }: BrandLogoProps) {
  return (
    <img
      src={logo}
      alt="V-Stable"
      width={1370}
      height={430}
      className={'block h-auto max-w-full object-contain ' + className}
    />
  )
}
