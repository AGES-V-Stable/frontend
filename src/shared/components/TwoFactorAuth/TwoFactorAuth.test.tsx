import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TwoFactorAuth } from './TwoFactorAuth'

describe('TwoFactorAuth', () => {
  it('renders default label, placeholder and description', () => {
    render(<TwoFactorAuth value="" onChange={vi.fn()} />)

    expect(screen.getByLabelText('Código de autenticação')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
    expect(
      screen.getByText('Insira o código de 6 dígitos gerado pelo seu aplicativo autenticador.'),
    ).toBeInTheDocument()
  })

  it('filters non-numeric characters and limits to 6 digits', () => {
    const handleChange = vi.fn()
    render(<TwoFactorAuth value="" onChange={handleChange} />)

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: 'ab12cd345678' } })

    expect(handleChange).toHaveBeenCalledWith('123456')
  })

  it('calls onVerify when exactly 6 digits are typed', () => {
    const handleVerify = vi.fn()
    render(<TwoFactorAuth value="" onChange={vi.fn()} onVerify={handleVerify} />)

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '654321' } })

    expect(handleVerify).toHaveBeenCalledWith('654321')
  })

  it('calls onVerify when Enter is pressed with 6 digits', () => {
    const handleVerify = vi.fn()
    render(<TwoFactorAuth value="123456" onChange={vi.fn()} onVerify={handleVerify} />)

    const input = screen.getByPlaceholderText('000000')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(handleVerify).toHaveBeenCalledWith('123456')
  })

  it('does not call onVerify on Enter if code has fewer than 6 digits', () => {
    const handleVerify = vi.fn()
    render(<TwoFactorAuth value="123" onChange={vi.fn()} onVerify={handleVerify} />)

    const input = screen.getByPlaceholderText('000000')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(handleVerify).not.toHaveBeenCalled()
  })

  it('displays an error message with role alert and aria-invalid', () => {
    render(<TwoFactorAuth value="123456" onChange={vi.fn()} error="Código inválido ou expirado" />)

    const input = screen.getByPlaceholderText('000000')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Código inválido ou expirado')
  })

  it('disables input when disabled prop is true', () => {
    render(<TwoFactorAuth value="" onChange={vi.fn()} disabled />)

    expect(screen.getByPlaceholderText('000000')).toBeDisabled()
  })
})
