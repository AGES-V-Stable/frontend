import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AdminDashboard } from './AdminDashboard'

describe('AdminDashboard', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('informs that consolidated metrics are not available yet, without querying company endpoints', () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)

    render(<AdminDashboard />)

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'As métricas consolidadas da plataforma estarão disponíveis em breve.',
    )
    expect(fetcher).not.toHaveBeenCalled()
  })
})
