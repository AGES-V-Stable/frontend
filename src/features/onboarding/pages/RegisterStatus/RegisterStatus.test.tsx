import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { RegisterStatus } from '@/features/onboarding/pages/RegisterStatus/RegisterStatus'

function renderPage(initialEntries = ['/register/status']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <RegisterStatus />
    </MemoryRouter>,
  )
}

describe('RegisterStatus Page Component', () => {
  it('given the RegisterStatus page with twoFactor=true, when rendered, then it should display the ComplianceStatusCard in review', () => {
    renderPage(['/register/status?twoFactor=true'])

    expect(screen.getByText('Seu cadastro está em análise')).toBeInTheDocument()
  })

  it('given the RegisterStatus page, when rendered, then it should display the support text', () => {
    renderPage(['/register/status?twoFactor=true'])

    expect(
      screen.getByText('Precisa de ajuda? Entre em contato com o suporte da V-Stable.'),
    ).toBeInTheDocument()
  })

  it('given the RegisterStatus page with twoFactor=false, then it renders the 2FA mandatory activation screen', () => {
    renderPage(['/register/status?twoFactor=false'])

    expect(screen.getByText('Ativação de Segurança Obrigatória')).toBeInTheDocument()
  })

  it('given status=NOT_APPROVED query param, then it renders the not approved screen', () => {
    renderPage(['/register/status?status=NOT_APPROVED'])

    expect(screen.getByText('Cadastro não aprovado')).toBeInTheDocument()
  })
})
