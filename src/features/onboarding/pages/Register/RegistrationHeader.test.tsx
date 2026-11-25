import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RegistrationHeader } from '@/features/onboarding/pages/Register/RegistrationHeader'

describe('RegistrationHeader', () => {
  it('uses the default description and identifies the active step', () => {
    render(<RegistrationHeader activeStep={1} />)

    expect(
      screen.getByText('Preencha os dados solicitados para concluir o cadastro institucional.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Passo 2 de 5')).toBeInTheDocument()
    expect(screen.getByText('Acesso').previousElementSibling).toHaveTextContent('✓')
    expect(screen.getByText('Empresa').previousElementSibling).toHaveTextContent('2')
  })
  it('shows facial verification as the fifth step with earlier steps completed', () => {
    render(<RegistrationHeader activeStep={4} />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Cadastro Institucional' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'V-Stable' })).toBeInTheDocument()
    const steps = within(screen.getByRole('list', { name: 'Passo 5 de 5' })).getAllByRole(
      'listitem',
    )
    expect(steps).toHaveLength(5)
    expect(steps.map((step) => step.textContent)).toEqual([
      '✓Acesso',
      '✓Empresa',
      '✓Representante',
      '✓Compliance',
      '5Verificação facial',
    ])
    for (const step of steps.slice(0, 4)) expect(step).not.toHaveAttribute('aria-current')
    expect(steps[4]).toHaveAttribute('aria-current', 'step')
  })
})
