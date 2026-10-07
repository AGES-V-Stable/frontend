import type { AdminNavIconId } from './AdminNavIcon'

export interface NavBarItem {
  id: string
  icon: AdminNavIconId
  label: string
  path?: string
  activePaths?: string[]
}

export interface NavBarProps {
  className?: string
}
