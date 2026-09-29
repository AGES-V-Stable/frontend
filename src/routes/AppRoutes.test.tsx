import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppRoutes from './AppRoutes'
import { compliancePath, livenessPath, PATHS, registrationCompletePath } from './paths'

const id = '11111111-1111-4111-8111-111111111111'

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

  it('given the user navigates to the register path, when AppRoutes is rendered, then it should render the access step of the register wizard', () => {
    const initialRoute = PATHS.REGISTER

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Dados de acesso' })).toBeInTheDocument()
  })

  it('given the company or representative steps are opened without navigation state, when AppRoutes is rendered, then it should redirect back to the access step', () => {
    render(
      <MemoryRouter initialEntries={[PATHS.REGISTER_REPRESENTATIVE]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Dados de acesso' })).toBeInTheDocument()
  })

  it('given the user navigates to the compliance path with a kyc verification id, when AppRoutes is rendered, then it should render the ComplianceStep page with that id wired in', () => {
    render(
      <MemoryRouter initialEntries={[compliancePath(id)]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Cadastro Institucional' })).toBeInTheDocument()
    expect(screen.getByText('Compliance e documentos')).toBeInTheDocument()
  })

  it('given the user navigates to the compliance liveness path with a kyc verification id, when AppRoutes is rendered, then it should render the LivenessStep page with that id wired in', () => {
    render(
      <MemoryRouter initialEntries={[livenessPath(id)]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('Verificação facial')).toBeInTheDocument()
    // Sem progressoCadastroId a tela cai no branch de erro ao iniciar; com o id vindo da
    // URL, o botão de iniciar não deve estar desabilitado por falta de contexto.
    expect(screen.getByRole('button', { name: 'Iniciar verificação facial' })).toBeEnabled()
  })

  it('given the user navigates to the registration-complete path, when AppRoutes is rendered, then it should render the RegistrationComplete page', () => {
    render(
      <MemoryRouter initialEntries={[registrationCompletePath(id)]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Cadastro enviado' })).toBeInTheDocument()
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
