import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { Observability } from './Observability'

const event = {
  id: '11111111-1111-4111-8111-111111111111',
  occurredAt: '2026-11-16T12:00:00Z',
  severity: 'INFO',
  module: 'company',
  action: 'company.creation.completed',
  actorId: '22222222-2222-4222-8222-222222222222',
  entityType: 'company',
  entityId: '33333333-3333-4333-8333-333333333333',
  outcome: 'success',
  failed: false,
  durationMs: 34,
  message: 'Application event: company.creation.completed',
  correlationId: '44444444-4444-4444-8444-444444444444',
  source: 'backend',
  metadata: { method: 'POST' },
}
const page = {
  content: [event],
  page: 0,
  size: 25,
  totalElements: 26,
  totalPages: 2,
  errors: 3,
  failuresByModule: [{ module: 'transfer', failures: 2 }],
}
afterEach(() => vi.unstubAllGlobals())

it('loads backend events, indicators, details and correlated events', async () => {
  const mock = vi
    .fn()
    .mockImplementation((url: string) =>
      Promise.resolve(
        new Response(JSON.stringify(url.includes(`events/${event.id}`) ? event : page)),
      ),
    )
  vi.stubGlobal('fetch', mock)
  render(<Observability />)
  expect(screen.getByText('Carregando eventos...')).toBeInTheDocument()
  expect(await screen.findByText(event.action)).toBeInTheDocument()
  expect(screen.getByText('transfer: 2')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /Ver detalhes:/ }))
  const drawer = await screen.findByRole('dialog')
  expect(await within(drawer).findByText(event.correlationId)).toBeInTheDocument()
  expect(within(drawer).getByText(event.entityId)).toBeInTheDocument()
  expect(within(drawer).getByText(event.actorId)).toBeInTheDocument()
  await userEvent.click(
    within(drawer).getByRole('button', { name: 'Ver eventos desta correlação' }),
  )
  await waitFor(() =>
    expect(
      mock.mock.calls.some(([url]) => String(url).includes(`correlationId=${event.correlationId}`)),
    ).toBe(true),
  )
})

it('applies filters, ordering and server pagination', async () => {
  const mock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(page))))
  vi.stubGlobal('fetch', mock)
  render(<Observability />)
  await screen.findByText(event.action)
  await userEvent.selectOptions(screen.getByLabelText('Severidade'), 'ERROR')
  fireEvent.change(screen.getByLabelText('Módulo'), { target: { value: 'transfer' } })
  fireEvent.change(screen.getByLabelText('Ação'), {
    target: { value: 'transfer.creation.completed' },
  })
  fireEvent.change(screen.getByLabelText('Resultado'), { target: { value: 'failure' } })
  await userEvent.selectOptions(screen.getByLabelText('Ordenação'), 'asc')
  await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
  await screen.findByText(event.action)
  const url = mock.mock.calls.at(-1)![0] as string
  expect(url).toContain('severity=ERROR')
  expect(url).toContain('module=transfer')
  expect(url).toContain('action=transfer.creation.completed')
  expect(url).toContain('outcome=failure')
  expect(url).toContain('order=asc')
  await userEvent.click(screen.getByRole('button', { name: 'Próxima' }))
  await waitFor(() => expect(mock.mock.calls.at(-1)![0]).toContain('page=1'))
})

it('shows empty data and allows retry after a loading error', async () => {
  const mock = vi
    .fn()
    .mockResolvedValueOnce(new Response('{}', { status: 500 }))
    .mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            ...page,
            content: [],
            totalElements: 0,
            totalPages: 0,
            errors: 0,
            failuresByModule: [],
          }),
        ),
      ),
    )
  vi.stubGlobal('fetch', mock)
  render(<Observability />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os eventos')
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(
    await screen.findByText('Nenhum evento encontrado para os filtros selecionados.'),
  ).toBeInTheDocument()
  expect(screen.getByText('Nenhuma falha.')).toBeInTheDocument()
})
