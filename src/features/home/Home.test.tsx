import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { Home } from './Home'

vi.mock('@/shared/services/user', () => ({
  getCurrentUser: vi
    .fn()
    .mockResolvedValue({ id: 'u1', name: 'PME User', email: '', companyId: 'c1' }),
}))

describe('Home layout', () => {
  it.each(['ADMIN', 'USER'])(
    'composes content with navigation for stored role %s',
    async (role) => {
      localStorage.setItem('token', `header.${btoa(JSON.stringify({ role: [role] }))}.signature`)
      render(
        <MemoryRouter>
          <Home>
            <main>
              <h1>Conteúdo da página</h1>
            </main>
          </Home>
        </MemoryRouter>,
      )

      expect(screen.getAllByRole('navigation')).toHaveLength(1)
      expect(screen.getByRole('heading', { name: 'Conteúdo da página' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
      if (role === 'ADMIN')
        expect(screen.getByRole('button', { name: 'Clientes PME' })).toBeInTheDocument()
      else {
        expect(screen.queryByRole('button', { name: 'Clientes PME' })).not.toBeInTheDocument()
        await vi.waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
      }
    },
  )
})
