import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { Home } from './Home'

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/register" element={<p>Register page</p>} />
        <Route path="/admin/clientes-pme" element={<p>Admin page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Home Page Component', () => {
  it('demonstrates all sidebar sections with local selection', async () => {
    const user = userEvent.setup()
    renderHome()

    expect(screen.getByRole('button', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
    for (const label of ['Beneficiários', 'Transferências', 'Configurações', 'Início']) {
      await user.click(screen.getByRole('button', { name: label }))
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-current', 'page')
    }
  })

  it('given the Home component, when rendered, then it should display the application title text', () => {
    renderHome()

    expect(screen.getByText('V-Stable')).toBeInTheDocument()
  })

  it('given the Home component, when rendered, then it should display the client table', () => {
    renderHome()

    expect(screen.getByText('Todos os clientes')).toBeInTheDocument()
  })

  it('navigates to the login page when "Ir para Login" is clicked', async () => {
    const user = userEvent.setup()
    renderHome()

    await user.click(screen.getByRole('button', { name: 'Ir para Login' }))

    expect(await screen.findByText('Login page')).toBeInTheDocument()
  })

  it('navigates to the register page when "Ir para Cadastro" is clicked', async () => {
    const user = userEvent.setup()
    renderHome()

    await user.click(screen.getByRole('button', { name: 'Ir para Cadastro' }))

    expect(await screen.findByText('Register page')).toBeInTheDocument()
  })

  it('navigates to the admin clients page when "Ir para Clientes PME" is clicked', async () => {
    const user = userEvent.setup()
    renderHome()

    await user.click(screen.getByRole('button', { name: 'Ir para Clientes PME' }))

    expect(await screen.findByText('Admin page')).toBeInTheDocument()
  })
})
