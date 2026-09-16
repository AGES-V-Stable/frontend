import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Register } from './Register'

describe('Register Page Component', () => {
  it('displays the Register text', () => {
    render(<Register />)

    expect(screen.getByText('Register')).toBeInTheDocument()
  })
})
