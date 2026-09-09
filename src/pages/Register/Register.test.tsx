import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Register } from './Register'

describe('Register Page Component', () => {
  it('given the Register component, when rendered, then it should display the compliance step', () => {
    render(<Register />)

    expect(screen.getByText('Compliance e documentos')).toBeInTheDocument()
  })
})
