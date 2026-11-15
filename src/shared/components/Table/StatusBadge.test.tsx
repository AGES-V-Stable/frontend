import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatusBadge } from '@/shared/components/Table/StatusBadge'

const badgeOf = (label: string) => screen.getByText(label).parentElement

describe('StatusBadge', () => {
  it('uses the neutral color, never success, for a status without a known color', () => {
    // Given um rótulo que a inferência não reconhece
    render(<StatusBadge label="Rejeitada" />)

    // Then o badge não parece sucesso
    expect(badgeOf('Rejeitada')).toHaveClass('bg-slate-100', 'text-slate-700')
    expect(badgeOf('Rejeitada')).not.toHaveClass('bg-emerald-50')
  })

  it('applies the explicit variant over the inferred one', () => {
    render(<StatusBadge label="Concluída" variant="success" />)

    expect(badgeOf('Concluída')).toHaveClass('bg-emerald-50', 'text-primary')
  })

  it('keeps inferring warning and error from the label when no variant is given', () => {
    render(
      <>
        <StatusBadge label="Pendente" />
        <StatusBadge label="Falha" />
      </>,
    )

    expect(badgeOf('Pendente')).toHaveClass('bg-amber-50')
    expect(badgeOf('Falha')).toHaveClass('bg-red-50')
  })
})
