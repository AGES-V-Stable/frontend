import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppRoutes from './AppRoutes'
import { compliancePath, livenessPath, PATHS, registrationCompletePath } from './paths'

const id = '11111111-1111-4111-8111-111111111111'

describe('AppRoutes Navigation & Routing', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('given the user navigates to the root path, when AppRoutes is rendered, then it should render the Home page', () => {
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

  it('given the user navigates to the register path, when AppRoutes is rendered, then it should render the Register wizard', () => {
    const initialRoute = PATHS.REGISTER

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Cadastro Institucional' })).toBeInTheDocument()
    expect(screen.getByText('Representante').closest('li')).toHaveAttribute('aria-current', 'step')
  })

  it('given the user navigates to the compliance path with a kyc verification id, when AppRoutes is rendered, then it should render the ComplianceStep page with that id wired in', () => {
    render(
      <MemoryRouter initialEntries={[compliancePath(id)]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Compliance e documentos' })).toBeInTheDocument()
  })

  it('given the user navigates to the compliance liveness path with a kyc verification id, when AppRoutes is rendered, then it should render the LivenessStep page with that id wired in', () => {
    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('Verificação facial')).toBeInTheDocument()
  })

  it('given the user navigates to the compliance liveness path, when AppRoutes is rendered, then it should render the LivenessStep page', () => {
    const initialRoute = PATHS.COMPLIANCE_LIVENESS

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('Verificação facial')).toBeInTheDocument()
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
