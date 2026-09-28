import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppRoutes from './AppRoutes'
import { PATHS, representativePath } from './paths'

describe('AppRoutes Navigation & Routing', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the Home page for the root path', () => {
    const initialRoute = PATHS.HOME

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('V-Stable')).toBeInTheDocument()
  })

  it('renders the Login page for the login path', () => {
    const initialRoute = PATHS.LOGIN

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Bem-vindo à V-Stable!' })).toBeInTheDocument()
  })

  it('renders the Register page for the register path', () => {
    const initialRoute = PATHS.REGISTER

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Dados de acesso' })).toBeInTheDocument()
  })

  it('renders RepresentativeStep when navigating to the representative path with a valid onboarding id', async () => {
    const registrationId = '123e4567-e89b-12d3-a456-426614174000'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ token: registrationId, empresaId: 'empresa-1', etapaAtual: 3 }),
      }),
    )

    render(
      <MemoryRouter initialEntries={[representativePath(registrationId)]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Dados do Representante')).toBeInTheDocument()
    })
  })

  it('renders the placeholder screen for the forgot password path', () => {
    const initialRoute = PATHS.FORGOT_PASSWORD

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('Recuperação de Senha (Em breve)')).toBeInTheDocument()
  })

  it('redirects to the Home page for an unknown route', () => {
    const unknownRoute = '/unknown-non-existent-route'

    render(
      <MemoryRouter initialEntries={[unknownRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('V-Stable')).toBeInTheDocument()
  })
})
