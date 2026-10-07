import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getCompany } from '@/shared/services/company'
import { getCurrentUser } from '@/shared/services/user'
import AppRoutes from './AppRoutes'

vi.mock('@/shared/services/company', () => ({ getCompany: vi.fn() }))
vi.mock('@/shared/services/user', () => ({ getCurrentUser: vi.fn() }))

function renderHome(role: string) {
  localStorage.setItem('token', `header.${btoa(JSON.stringify({ role }))}.signature`)
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('home path flow', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset().mockResolvedValue({
      id: 'user-1',
      name: 'Maria Silva',
      email: 'maria@example.com',
      companyId: 'company-1',
    })
    vi.mocked(getCompany).mockReset().mockResolvedValue({
      id: 'company-1',
      legalName: 'Empresa Teste',
      cnpj: '04933111000190',
      availableBalanceBrl: 1234.56,
    })
  })

  it('routes an admin from home through the shared Auditoria menu to existing destinations', async () => {
    const user = userEvent.setup()
    renderHome('ADMIN')
    expect(screen.getByRole('heading', { name: 'Painel administrativo' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Auditoria' }))
    expect(screen.getByRole('heading', { name: 'Auditoria' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Consultar beneficiários' })).toHaveAttribute(
      'href',
      '/admin/beneficiarios',
    )
    expect(screen.getByRole('link', { name: 'Consultar transferências' })).toHaveAttribute(
      'href',
      '/admin/transferencias',
    )
    expect(getCurrentUser).not.toHaveBeenCalled()
    expect(getCompany).not.toHaveBeenCalled()
  })

  it('shares one account request across the PME header, menu and live balance', async () => {
    renderHome('USER')
    expect(screen.getByRole('heading', { name: 'Visão geral da conta PME' })).toBeInTheDocument()
    expect(await screen.findByText(/1\.234,56/)).toBeInTheDocument()
    expect(screen.getByText('Maria Silva • MS')).toBeInTheDocument()
    expect(screen.getByText('Empresa Teste')).toBeInTheDocument()
    expect(getCurrentUser).toHaveBeenCalledTimes(1)
    expect(getCompany).toHaveBeenCalledTimes(1)
    expect(getCompany).toHaveBeenCalledWith('company-1', expect.any(AbortSignal))
    expect(screen.getByRole('button', { name: 'Transferências' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Configurações' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Suporte' })).toBeDisabled()
  })

  it('keeps the PME beneficiary destination accessible from home', async () => {
    const user = userEvent.setup()
    renderHome('USER')
    await screen.findByText('Empresa Teste')
    await user.click(screen.getByRole('link', { name: 'Gerenciar beneficiários' }))
    expect(screen.getByRole('heading', { name: 'Beneficiários' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Beneficiários' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Novo beneficiário' }))
    expect(screen.getByRole('heading', { name: 'Cadastrar beneficiário' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('heading', { name: 'Beneficiários' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  })

  it('preserves the user identity and shows unavailable balance when company loading fails', async () => {
    vi.mocked(getCompany).mockRejectedValue(new Error('network unavailable'))
    renderHome('USER')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os dados da empresa.',
    )
    expect(screen.getByText('Maria Silva • MS')).toBeInTheDocument()
    expect(screen.getByText('Saldo indisponível no momento')).toBeInTheDocument()
  })

  it('does not request a company or invent a balance for a user without a company', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'user-1',
      name: 'Maria Silva',
      email: 'maria@example.com',
      companyId: '',
    })
    renderHome('USER')
    expect(await screen.findByText('Saldo indisponível no momento')).toBeInTheDocument()
    expect(getCompany).not.toHaveBeenCalled()
  })
})
