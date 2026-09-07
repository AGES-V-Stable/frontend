import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Home } from './Home'

describe('Home Page Component', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('given the Home component, when rendered, then it should display the application title text', () => {
    render(<Home />)

    expect(screen.getByText('V-Stable')).toBeInTheDocument()
  })

  it('given the Home component, when rendered, then it should display the enabled button showcase', () => {
    render(<Home />)

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Esqueci minha senha' })).toBeEnabled()
  })

  it('given the Home component, when rendered, then it should display the disabled button showcase', () => {
    render(<Home />)

    expect(screen.getByRole('button', { name: 'Primário Desabilitado' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Secundário Desabilitado' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Terciário Desabilitado' })).toBeDisabled()
  })

  it.each([
    ['Continuar', 'Primary clicked'],
    ['Voltar', 'Secondary clicked'],
    ['Esqueci minha senha', 'Tertiary clicked'],
  ])(
    'given the Home component, when the %s button is clicked, then it should run its click handler',
    async (label, message) => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      render(<Home />)

      await userEvent.click(screen.getByRole('button', { name: label }))

      expect(logSpy).toHaveBeenCalledWith(message)
    },
  )

  it('given the Home component, when a disabled button is clicked, then it should not run its click handler', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    render(<Home />)

    await userEvent.click(screen.getByRole('button', { name: 'Primário Desabilitado' }))

    expect(logSpy).not.toHaveBeenCalled()
  })

  it('given the Home component, when the user types in the input, then it should run its change handler', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    render(<Home />)

    await userEvent.type(screen.getByRole('textbox'), '1')

    expect(logSpy).toHaveBeenCalledWith('1')
  })
})
