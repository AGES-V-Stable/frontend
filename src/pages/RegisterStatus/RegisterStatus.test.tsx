import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RegisterStatus } from './RegisterStatus'

describe('RegisterStatus Page Component', () => {
  it('given the RegisterStatus page, when rendered, then it should display the ComplianceStatusCard', () => {
    render(<RegisterStatus />)

    expect(screen.getByText('Cadastro não aprovado')).toBeInTheDocument()
  })

  it('given the RegisterStatus page, when rendered, then it should display the support text', () => {
    render(<RegisterStatus />)

    expect(
      screen.getByText('Precisa de ajuda? Entre em contato com o suporte da V-Stable.'),
    ).toBeInTheDocument()
  })
})