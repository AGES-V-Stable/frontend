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

    expect(screen.getByRole('heading', { name: 'Dados de acesso' })).toBeInTheDocument()
  })

  it('given a valid onboarding id, when navigating to the representative path, then it should render RepresentativeStep', async () => {
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

  it('given the user navigates to the forgot password path, when AppRoutes is rendered, then it should render the placeholder screen', () => {
    const initialRoute = PATHS.FORGOT_PASSWORD

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('Recuperação de Senha (Em breve)')).toBeInTheDocument()
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
