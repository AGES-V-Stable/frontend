import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NavBar } from '@/app/components/NavBar'

const renderNavBar = (activeId: string) =>
  render(
    <NavBar
      logo={<span>V-Stable</span>}
      items={[
        { id: 'dashboard', label: 'Dashboard', icon: null },
        { id: 'beneficiaries', label: 'Beneficiários', icon: null },
      ]}
      activeId={activeId}
      account={{ name: 'Atlas', description: 'Conta empresarial', initials: 'AT' }}
      footerItems={[]}
    />,
  )

describe('NavBar', () => {
  it('shows the selected item with the darker green text that reaches 4.5:1 on its tinted background', () => {
    // Given o Dashboard selecionado
    renderNavBar('dashboard')

    // Then o item ativo usa o verde escuro, e o inativo continua cinza
    expect(screen.getByRole('button', { name: 'Dashboard' })).toHaveClass('text-emerald-800')
    expect(screen.getByRole('button', { name: 'Dashboard' })).not.toHaveClass('text-primary')
    expect(screen.getByRole('button', { name: 'Beneficiários' })).toHaveClass('text-slate-500')
  })
})
