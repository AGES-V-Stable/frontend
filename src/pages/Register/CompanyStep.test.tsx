import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import AppRoutes from '@/routes/AppRoutes'
import { PATHS } from '@/routes/paths'
import { CompanyStep, type CompanyData } from './CompanyStep'

const valid: CompanyData = {
  razaoSocial: 'Empresa Ltda.',
  pais: 'Brasil',
  cnpj: '11222333000181',
  cep: '90000000',
  cidade: '',
  estado: 'RS',
}

describe('CompanyStep', () => {
  it.each([
    [{ razaoSocial: 'ab' }, 'Use pelo menos 3 caracteres.'],
    [{ estado: 'a'.repeat(101) }, 'Use no máximo 100 caracteres.'],
    [{ cnpj: '11222333000182' }, 'CNPJ inválido.'],
    [{ cnpj: '00000000000000' }, 'CNPJ inválido.'],
  ])('rejects backend validation violations %j', async (values, message) => {
    const submit = vi.fn()
    render(
      <CompanyStep
        initialValues={{ ...valid, ...values }}
        onCancel={vi.fn()}
        onContinue={submit}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(submit).not.toHaveBeenCalled()
  })

  it('preserves foreign postal codes and revalidates when switching country', async () => {
    const user = userEvent.setup()
    const submit = vi.fn()
    render(
      <CompanyStep
        initialValues={{ ...valid, pais: 'Canada', cep: 'K1A 0B1' }}
        onCancel={vi.fn()}
        onContinue={submit}
      />,
    )
    const cep = screen.getByRole('textbox', { name: 'CEP *' })
    expect(cep).toHaveValue('K1A 0B1')
    await user.clear(cep)
    await user.type(cep, 'K2B 1C3')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ cep: 'K2B 1C3' }))
    const country = screen.getByRole('textbox', { name: 'País *' })
    await user.clear(country)
    await user.type(country, 'Brasil')
    expect(screen.getByRole('alert')).toHaveTextContent('Informe um CEP com 8 dígitos.')
  })

  it('shows the design fields, default country and active step', () => {
    render(<CompanyStep onCancel={vi.fn()} onContinue={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Cadastro Institucional' })).toBeInTheDocument()
    expect(screen.getAllByRole('textbox')).toHaveLength(6)
    expect(screen.getByRole('textbox', { name: 'País *' })).toHaveValue('Brasil')
    expect(screen.getByText('Empresa').closest('li')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('textbox', { name: 'Cidade' })).not.toBeRequired()
  })

  it('blocks invalid submission, focuses the first error and revalidates edits', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    render(
      <CompanyStep
        initialValues={{ razaoSocial: '   ', pais: '' }}
        onCancel={vi.fn()}
        onContinue={onContinue}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    const name = screen.getByRole('textbox', { name: 'Razão Social *' })
    expect(name).toHaveFocus()
    expect(name).toHaveAccessibleDescription('Campo obrigatório.')
    expect(screen.getAllByRole('alert')).toHaveLength(5)
    expect(onContinue).not.toHaveBeenCalled()
    await user.type(name, 'Empresa')
    expect(name).toHaveAttribute('aria-invalid', 'false')
    await user.type(screen.getByRole('textbox', { name: 'CNPJ *' }), '123')
    expect(screen.getByText('Informe um CNPJ com 14 dígitos.')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'País *' }), 'Brasil')
    await user.type(screen.getByRole('textbox', { name: 'CEP *' }), '12')
    expect(screen.getByText('Informe um CEP com 8 dígitos.')).toBeInTheDocument()
  })

  it('masks pasted values, limits length, accepts optional city and sends current data', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    render(<CompanyStep initialValues={valid} onCancel={vi.fn()} onContinue={onContinue} />)
    const cnpj = screen.getByRole('textbox', { name: 'CNPJ *' })
    expect(cnpj).toHaveValue('11.222.333/0001-81')
    await user.clear(cnpj)
    await user.paste('11.222.333/0001-81999')
    expect(cnpj).toHaveValue('11.222.333/0001-81')
    const cep = screen.getByRole('textbox', { name: 'CEP *' })
    await user.clear(cep)
    await user.paste('90000-000999')
    expect(cep).toHaveValue('90000-000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(onContinue).toHaveBeenCalledWith({
      ...valid,
      cnpj: '11.222.333/0001-81',
      cep: '90000-000',
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('cancels without requiring valid data', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<CompanyStep onCancel={onCancel} onContinue={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('supports keyboard submission', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    render(<CompanyStep initialValues={valid} onCancel={vi.fn()} onContinue={onContinue} />)
    await user.tab()
    expect(screen.getByRole('textbox', { name: 'Razão Social *' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onContinue).toHaveBeenCalledOnce()
  })
})

describe('Company registration route', () => {
  it('requires a progress link and provides a return to register', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[PATHS.REGISTER_COMPANY]}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Link de cadastro ausente ou inválido')
    await user.click(screen.getByRole('link', { name: 'Voltar ao cadastro' }))
    expect(screen.getByText('Compliance e documentos')).toBeInTheDocument()
  })
})
