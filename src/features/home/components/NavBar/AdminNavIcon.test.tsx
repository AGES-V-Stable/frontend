import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AdminNavIcon, type AdminNavIconId } from './AdminNavIcon'

describe('navigation icons', () => {
  it.each<AdminNavIconId>(['home', 'beneficiaries', 'transfers', 'settings', 'support'])(
    'uses a decorative design asset for %s',
    (id) => {
      const { container, rerender } = render(<AdminNavIcon id={id} />)
      expect(container.querySelector('img')).toHaveAttribute('alt', '')
      expect(container.querySelector('img')).toHaveAttribute(
        'src',
        expect.stringMatching(/^(data:image\/svg\+xml|.*\.svg)/),
      )
      rerender(<AdminNavIcon id={id} active />)
      expect(container.querySelector('img')).toHaveAttribute('aria-hidden', 'true')
    },
  )
})
