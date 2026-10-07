import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'
import { AppProviders } from './providers/AppProviders'

describe('App Component', () => {
  it('renders the active route content', () => {
    const routerWrapper = (
      <AppProviders>
        <App />
      </AppProviders>
    )

    render(routerWrapper)

    expect(screen.getByRole('heading', { name: 'Visão geral da conta PME' })).toBeInTheDocument()
  })
})
