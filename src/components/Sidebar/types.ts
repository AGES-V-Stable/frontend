import type { ReactNode } from 'react'

export interface SidebarItem {
  id: string
  icon: ReactNode
  label: string
  onClick: () => void
}

export interface SidebarProps {
  logo: ReactNode
  items: SidebarItem[]
  activeItemId: string
  account: {
    name: string
    description: string
    initials: string
  }
  className?: string
}
