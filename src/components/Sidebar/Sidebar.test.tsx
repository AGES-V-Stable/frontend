import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Sidebar } from './Sidebar'
import type { SidebarProps } from './types'

function createProps(): SidebarProps {
  return {
    logo: <span>Logo da empresa</span>,
    items: [
      { id: 'home', label: 'Início', icon: <svg />, onClick: vi.fn() },
      { id: 'transfers', label: 'Transferências', icon: <svg />, onClick: vi.fn() },
    ],
    activeItemId: 'home',
    account: { name: 'Empresa Exemplo', description: 'Conta empresarial', initials: 'EE' },
  }
}

describe('Sidebar', () => {
  it('renders the supplied logo, navigation and account information', () => {
    render(<Sidebar {...createProps()} className="sticky top-0" />)

    expect(screen.getByText('Logo da empresa')).toBeInTheDocument()
    const navigation = screen.getByRole('navigation', { name: 'Navegação principal' })
    expect(within(navigation).getAllByRole('button')).toHaveLength(2)
    expect(screen.getByText('Empresa Exemplo')).toBeInTheDocument()
    expect(screen.getByText('Conta empresarial')).toBeInTheDocument()
    expect(screen.getByText('EE')).toBeInTheDocument()
  })

  it('calls only the selected action and leaves selection controlled by the consumer', async () => {
    const user = userEvent.setup()
    const props = createProps()
    const { rerender } = render(<Sidebar {...props} />)
    const home = screen.getByRole('button', { name: 'Início' })
    const transfers = screen.getByRole('button', { name: 'Transferências' })

    expect(home).toHaveAttribute('aria-current', 'page')
    expect(transfers).not.toHaveAttribute('aria-current')
    await user.click(transfers)
    expect(props.items[1].onClick).toHaveBeenCalledOnce()
    expect(props.items[0].onClick).not.toHaveBeenCalled()
    expect(home).toHaveAttribute('aria-current', 'page')

    rerender(<Sidebar {...props} activeItemId="transfers" />)
    expect(home).not.toHaveAttribute('aria-current')
    expect(transfers).toHaveAttribute('aria-current', 'page')
  })

  it('supports tab navigation and activation with Enter and Space', async () => {
    const user = userEvent.setup()
    const props = createProps()
    render(<Sidebar {...props} />)

    await user.tab()
    expect(screen.getByRole('button', { name: 'Início' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(props.items[0].onClick).toHaveBeenCalledOnce()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Transferências' })).toHaveFocus()
    await user.keyboard(' ')
    expect(props.items[1].onClick).toHaveBeenCalledOnce()
  })
})
