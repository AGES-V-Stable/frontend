import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import AppRoutes from './AppRoutes'
import { PATHS } from './paths'

describe('AppRoutes Navigation & Routing', () => {
  it('given the user navigates to the root path, when AppRoutes is rendered, then it should render the Home page', () => {
    const initialRoute = PATHS.HOME

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('V-Stable')).toBeInTheDocument()
  })

  it('given the user navigates to the login path, when AppRoutes is rendered, then it should render the Login page', () => {
    const initialRoute = PATHS.LOGIN

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  it('given the user navigates to the register path, when AppRoutes is rendered, then it should render the Register page', () => {
    const initialRoute = PATHS.REGISTER

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('Register')).toBeInTheDocument()
  })

  it('given the user navigates to an unknown route, when AppRoutes is rendered, then it should redirect to the Home page', () => {
    const unknownRoute = '/unknown-non-existent-route'

    render(
      <MemoryRouter initialEntries={[unknownRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('V-Stable')).toBeInTheDocument()
  })
})
