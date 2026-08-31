import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Home } from './Home'

describe('Home Page Component', () => {
  it('given the Home component, when rendered, then it should display the application title text', () => {
    render(<Home />)

    expect(screen.getByText('V-Stable')).toBeInTheDocument()
  })
})
