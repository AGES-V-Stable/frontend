import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AdminNavIcon, type AdminNavIconId } from './AdminNavIcon'

describe('AdminNavIcon', () => {
  it.each<AdminNavIconId>(['home', 'beneficiaries', 'transfers', 'settings'])(
    'renders a distinct svg for "%s"',
    (id) => {
      const { container } = render(<AdminNavIcon id={id} />)
      expect(container.querySelector('svg')).toBeInTheDocument()
    },
  )
})
