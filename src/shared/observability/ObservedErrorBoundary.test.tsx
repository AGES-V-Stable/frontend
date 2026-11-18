import { render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { saveLoginToken } from '@/shared/http/authToken'
import { ObservedErrorBoundary } from './ObservedErrorBoundary'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('renders its children when the interface is healthy', () => {
  render(
    <ObservedErrorBoundary>
      <p>Operação disponível</p>
    </ObservedErrorBoundary>,
  )
  expect(screen.getByText('Operação disponível')).toBeInTheDocument()
})

it('captures a render failure, shows recovery and omits the exception contents', async () => {
  saveLoginToken('synthetic-login')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
  vi.stubGlobal('fetch', fetchMock)
  function BrokenView(): never {
    throw new Error('private-field-value')
  }
  render(
    <ObservedErrorBoundary>
      <BrokenView />
    </ObservedErrorBoundary>,
  )
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível exibir esta tela.')
  expect(screen.getByRole('button', { name: 'Recarregar aplicação' })).toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ kind: 'UI_ERROR' })
  expect(fetchMock.mock.calls[0][1].body).not.toContain('private-field-value')
})
