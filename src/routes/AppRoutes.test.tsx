import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppRoutes from './AppRoutes'
import { PATHS, representativePath } from './paths'

describe('AppRoutes Navigation & Routing', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

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

    expect(screen.getByRole('heading', { name: 'Bem-vindo à V-Stable!' })).toBeInTheDocument()
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

  it('given a valid onboarding id, when navigating to the representative path, then it should render RepresentativeStep', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }),
    )

    render(
      <MemoryRouter initialEntries={[representativePath('cad-123')]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Dados do Representante')).toBeInTheDocument()
    })
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
