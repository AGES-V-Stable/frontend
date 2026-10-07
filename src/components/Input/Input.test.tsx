import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Input } from './Input'

describe('Input', () => {
  it('renders the label associated with the field', () => {
    render(<Input label="E-mail" value="" onChange={vi.fn()} />)

    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
  })

  it('shows the error message and marks the field as invalid', () => {
    render(<Input label="E-mail" value="" onChange={vi.fn()} error="E-mail inválido" />)

    const input = screen.getByLabelText('E-mail')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('E-mail inválido')
    expect(input.className).toContain('border-red-700')
  })

  it('keeps a visible focus indicator so keyboard users can see the active field', () => {
    render(<Input label="CEP" value="" onChange={vi.fn()} />)

    const input = screen.getByLabelText('CEP')
    expect(input.className).toContain('focus-visible:outline-2')
    expect(input.className).toContain('focus-visible:outline-offset-2')
    expect(input.className).toContain('focus-visible:outline-primary')
  })

  it('does not mark the field as invalid when there is no error', () => {
    render(<Input label="E-mail" value="" onChange={vi.fn()} />)

    const input = screen.getByLabelText('E-mail')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(input.className).toContain('border-sage-300')
  })
})
