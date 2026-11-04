import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Select } from '@/shared/components/Select/Select'

const options = [
  { value: 'a', label: 'Opção A' },
  { value: 'b', label: 'Opção B' },
]

describe('Select', () => {
  it('renders the label associated with the field and every option', () => {
    render(<Select label="Período" value="a" options={options} onChange={vi.fn()} />)

    const select = screen.getByLabelText('Período')
    expect(select).toHaveValue('a')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Opção A',
      'Opção B',
    ])
  })

  it('reports the chosen option', () => {
    const chosen: string[] = []
    render(
      <Select
        label="Período"
        value="a"
        options={options}
        onChange={(event) => chosen.push(event.target.value)}
      />,
    )

    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'b' } })

    expect(chosen).toEqual(['b'])
  })

  it('shows the error message and marks the field as invalid', () => {
    render(
      <Select label="Empresa" value="a" options={options} onChange={vi.fn()} error="Obrigatório" />,
    )

    const select = screen.getByLabelText('Empresa')
    expect(select).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Obrigatório')
    expect(select.className).toContain('border-red-700')
  })

  it('keeps the default border and a visible focus indicator without error', () => {
    render(<Select label="Empresa" value="a" options={options} onChange={vi.fn()} />)

    const select = screen.getByLabelText('Empresa')
    expect(select).toHaveAttribute('aria-invalid', 'false')
    expect(select.className).toContain('border-sage-300')
    expect(select.className).toContain('focus-visible:outline-primary')
  })

  it('can show the label inside the field, still associated with it', () => {
    render(
      <Select
        label="Período"
        labelPlacement="inside"
        value="a"
        options={options}
        onChange={vi.fn()}
      />,
    )

    const select = screen.getByLabelText('Período')
    expect(select.parentElement?.className).toContain('relative')
    expect(select).toHaveStyle({ paddingLeft: 'calc(1.25rem + 7ch)' })
  })
})
