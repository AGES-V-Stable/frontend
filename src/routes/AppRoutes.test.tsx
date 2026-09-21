import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import AppRoutes from './AppRoutes'
import { livenessPath, PATHS, registrationCompletePath } from './paths'

const id = '11111111-1111-4111-8111-111111111111'

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

  it('given the user navigates to the compliance liveness path with a progresso de cadastro id, when AppRoutes is rendered, then it should render the LivenessStep page with that id wired in', () => {
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
