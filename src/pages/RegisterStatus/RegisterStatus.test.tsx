import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { RegisterStatus } from './RegisterStatus'

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterStatus />
    </MemoryRouter>,
  )
}

describe('RegisterStatus Page Component', () => {
  it('given the RegisterStatus page, when rendered, then it should display the ComplianceStatusCard', () => {
    renderPage()

    expect(screen.getByText('Seu cadastro está em análise')).toBeInTheDocument()
  })

  it('given the RegisterStatus page, when rendered, then it should display the support text', () => {
    renderPage()

    expect(
      screen.getByText('Precisa de ajuda? Entre em contato com o suporte da V-Stable.'),
    ).toBeInTheDocument()
  })
})
