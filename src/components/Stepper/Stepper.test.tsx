import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Stepper } from './Stepper'

const steps = ['Dados', 'Revisão', 'Autenticação']

describe('Stepper', () => {
  it('announces the current step and marks it with aria-current', () => {
    render(<Stepper steps={steps} activeStep={0} />)

    expect(screen.getByLabelText('Passo 1 de 3')).toBeInTheDocument()
    expect(screen.getByText('Dados').closest('li')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText('Revisão').closest('li')).not.toHaveAttribute('aria-current')
  })

  it('shows previous steps as completed and the next ones with their number', () => {
    render(<Stepper steps={steps} activeStep={1} />)

    expect(screen.getByText('Dados').previousElementSibling).toHaveTextContent('✓')
    expect(screen.getByText('Revisão').previousElementSibling).toHaveTextContent('2')
    expect(screen.getByText('Autenticação').previousElementSibling).toHaveTextContent('3')
  })

  it('creates one column per step and applies the extra classes', () => {
    render(<Stepper steps={steps} activeStep={0} className="max-w-[1038px]" />)

    const list = screen.getByLabelText('Passo 1 de 3')
    expect(list).toHaveStyle({ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' })
    expect(list.className).toContain('max-w-[1038px]')
  })
})
