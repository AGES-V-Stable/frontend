import { StrictMode, type ReactNode } from 'react'
import { BrowserRouter } from 'react-router'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <StrictMode>
      <BrowserRouter>{children}</BrowserRouter>
    </StrictMode>
  )
}
