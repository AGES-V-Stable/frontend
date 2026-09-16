import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RegistrationHeader } from './RegistrationHeader'

describe('RegistrationHeader', () => {
  it('uses the default description and identifies the active step', () => {
    render(<RegistrationHeader activeStep={1} />)

    expect(
      screen.getByText('Preencha os dados solicitados para concluir o cadastro institucional.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Passo 2 de 4')).toBeInTheDocument()
    expect(screen.getByText('Acesso').previousElementSibling).toHaveTextContent('✓')
    expect(screen.getByText('Empresa').previousElementSibling).toHaveTextContent('2')
  })
})
