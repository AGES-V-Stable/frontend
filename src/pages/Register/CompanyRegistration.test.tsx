import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '@/routes/AppRoutes'
import { companyPath, compliancePath } from '@/routes/paths'

const id = '11111111-1111-4111-8111-111111111111'
const pending = { token: id, empresaId: null, etapaAtual: 2 }
const saved = { ...pending, empresaId: id, etapaAtual: 3 }
const result = {
  empresa_id: id,
  progresso_cadastro_id: id,
  etapa_atual: 3,
  proxima_etapa: 'compliance',
}
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
afterEach(() => vi.unstubAllGlobals())
function open(path = companyPath(id)) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}
async function fill() {
  const user = userEvent.setup()
  await screen.findByRole('textbox', { name: 'Razão Social *' })
  for (const [label, value] of [
    ['Razão Social *', 'Empresa Ltda'],
    ['CNPJ *', '11222333000181'],
    ['CEP *', '90000000'],
    ['Estado *', 'RS'],
  ]) {
    await user.type(screen.getByRole('textbox', { name: label }), value)
  }
  return user
}
describe('company API integration', () => {
  it('maps the payload and advances to compliance only after saving', async () => {
    let complete = false
    const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        complete = true
        return response(result, 201)
      }
      return response(complete ? saved : pending)
    })
    vi.stubGlobal('fetch', fetchMock)
    open()
    const user = await fill()
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByRole('heading', { name: 'Compliance' })).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')!
    expect(post[0]).toBe(`/v1/cadastros/${id}/empresa`)
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      razao_social: 'Empresa Ltda',
      pais: 'Brasil',
      cnpj: '11222333000181',
      cep: '90000000',
      cidade: null,
      estado: 'RS',
    })
  })
  it.each([companyPath(id), compliancePath(id)])('restores saved progress on %s', async (path) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response(saved)),
    )
    open(path)
    expect(await screen.findByRole('heading', { name: 'Compliance' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument()
  })
  it('returns premature compliance visits to the form', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response(pending)),
    )
    open(compliancePath(id))
    expect(await screen.findByRole('textbox', { name: 'CNPJ *' })).toBeInTheDocument()
  })
  it.each([400, 404, 409, 422, 500])('preserves values after HTTP %s', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, options) =>
        options?.method === 'POST'
          ? response({ message: 'Dados rejeitados' }, status)
          : response(pending),
      ),
    )
    open()
    const user = await fill()
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      status === 500 ? 'Tente novamente' : 'Dados rejeitados',
    )
    expect(screen.getByRole('textbox', { name: 'Razão Social *' })).toHaveValue('Empresa Ltda')
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
  })
  it('recovers a committed save when its response is lost', async () => {
    let committed = false
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, options) => {
        if (options?.method === 'POST') {
          committed = true
          throw new TypeError('offline')
        }
        return response(committed ? saved : pending)
      }),
    )
    open()
    const user = await fill()
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByRole('heading', { name: 'Compliance' })).toBeInTheDocument()
  })
  it('blocks repeated submission and cancellation while saving', async () => {
    let finish!: (value: Response) => void
    const fetchMock = vi.fn((_url, options) =>
      options?.method === 'POST'
        ? new Promise<Response>((resolve) => {
            finish = resolve
          })
        : Promise.resolve(response(pending)),
    )
    vi.stubGlobal('fetch', fetchMock)
    open()
    const user = await fill()
    await user.dblClick(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled()
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1)
    finish(response(result, 201))
    await screen.findByRole('heading', { name: 'Compliance' })
  })
  it('allows retry after loading fails', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValue(response(pending))
    vi.stubGlobal('fetch', fetchMock)
    open()
    await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('textbox', { name: 'CNPJ *' })).toBeInTheDocument()
  })
  it('reports a missing progress record', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 404 })),
    )
    open()
    expect(await screen.findByRole('alert')).toHaveTextContent('Cadastro não encontrado')
  })
  it('rejects an incompatible stage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ ...pending, etapaAtual: 1 })),
    )
    open()
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('não está disponível'))
  })
})
