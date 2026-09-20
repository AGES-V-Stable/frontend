import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App Component', () => {
  it('renders the active route content', () => {
    const routerWrapper = (
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    render(routerWrapper)

    expect(screen.getByText('V-Stable')).toBeInTheDocument()
  })
})
