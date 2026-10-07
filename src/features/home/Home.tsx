import type { ReactNode } from 'react'

import { AccountProvider } from './components/Account/AccountProvider'

import { NavBar } from './components/NavBar'

interface HomeProps {
  children: ReactNode
  className?: string
}

export function Home({ children, className = 'flex min-h-screen bg-slate-100' }: HomeProps) {
  return (
    <AccountProvider>
      <div className={className}>
        <NavBar className="sticky top-0" />
        {children}
      </div>
    </AccountProvider>
  )
}
