import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ActionIcon, type ActionIconId } from '@/shared/components/Icons/ActionIcon'

describe('ActionIcon', () => {
  it.each<ActionIconId>(['home', 'beneficiaries', 'transfers', 'settings'])(
    'renders a distinct svg for "%s"',
    (id) => {
      const { container } = render(<ActionIcon id={id} />)
      expect(container.querySelector('svg')).toBeInTheDocument()
    },
  )
})
