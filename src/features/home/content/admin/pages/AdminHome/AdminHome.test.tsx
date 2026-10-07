import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { AdminHome } from './AdminHome'

describe('Admin home', () => {
  beforeEach(() =>
    localStorage.setItem('token', `header.${btoa(JSON.stringify({ role: ['ADMIN'] }))}.signature`),
  )
  it.each([
    ['Gerenciar clientes PME', '/admin/clientes-pme', 'Clientes'],
    ['Acessar auditoria', '/admin/auditoria', 'Auditoria aberta'],
  ])('opens the existing flow from %s', async (label, path, result) => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path={path} element={<p>{result}</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Painel administrativo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ir para Login' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: label }))
    expect(screen.getByText(result)).toBeInTheDocument()
  })
})
