import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { Demo, DemoCompany, DemoCompliance, DemoRepresentative } from './Demo'

vi.mock('@/pages/Register/CompanyStep', () => ({
  CompanyStep: ({ onCancel, onContinue }: { onCancel: () => void; onContinue: () => void }) => (
    <div>
      <button onClick={onCancel}>Cancel company</button>
      <button onClick={onContinue}>Continue company</button>
    </div>
  ),
}))

vi.mock('@/pages/Register/RepresentativeStep', () => ({
  RepresentativeStep: ({ demo }: { demo?: boolean }) => <p>{demo ? 'Demo representative' : ''}</p>,
}))

vi.mock('@/pages/Register/ComplianceStep', () => ({
  default: ({ onContinue }: { onContinue: () => Promise<void> }) => (
    <button onClick={() => void onContinue()}>Demo compliance</button>
  ),
}))

function renderDemo(path = '/demo') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/demo" element={<Demo />} />
        <Route path="/demo/register/empresa" element={<DemoCompany />} />
        <Route path="/demo/register/representante" element={<p>Representative destination</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Demo pages', () => {
  it('lists every available demonstration route', () => {
    renderDemo()

    expect(screen.getByRole('navigation', { name: 'Telas disponíveis' })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(6)
    expect(screen.getByRole('link', { name: /Cadastro da empresa/ })).toHaveAttribute(
      'href',
      '/demo/register/empresa',
    )
    expect(screen.getByRole('link', { name: /Clientes PME/ })).toHaveAttribute(
      'href',
      '/demo/admin/clientes-pme',
    )
  })

  it('supports cancelling the company demo', async () => {
    const user = userEvent.setup()
    renderDemo('/demo/register/empresa')

    await user.click(screen.getByRole('button', { name: 'Cancel company' }))

    expect(screen.getByRole('heading', { name: 'Demonstração de telas' })).toBeInTheDocument()
  })

  it('advances from the company demo to the representative demo route', async () => {
    const user = userEvent.setup()
    renderDemo('/demo/register/empresa')

    await user.click(screen.getByRole('button', { name: 'Continue company' }))

    expect(screen.getByText('Representative destination')).toBeInTheDocument()
  })

  it('configures the representative and compliance demo adapters', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <MemoryRouter>
        <DemoRepresentative />
      </MemoryRouter>,
    )
    expect(screen.getByText('Demo representative')).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <DemoCompliance />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Demo compliance' }))
  })
})
