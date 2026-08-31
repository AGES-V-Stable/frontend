import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Login from './Login'

describe('Login Page Component', () => {
  it('given the Login component, when rendered, then it should display the login text', () => {
    render(<Login />)

    expect(screen.getByText('Login')).toBeInTheDocument()
  })
})
