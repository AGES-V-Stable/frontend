import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '@/routes/AppRoutes'
import { companyPath, compliancePath, completionPath } from '@/routes/paths'

const id = '11111111-1111-4111-8111-111111111111'
const pending = { token: id, empresaId: null, etapaAtual: 2 }
const saved = { ...pending, empresaId: id, etapaAtual: 3 }
const completed = {
  ...saved,
  etapaAtual: 4,
  statusGeral: 'EM_ANALISE',
  statusComplianceFinal: 'PENDENTE',
}
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
    expect(
      await screen.findByRole('heading', { name: 'Compliance e documentos' }),
    ).toBeInTheDocument()
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
    expect(
      await screen.findByRole('heading', { name: 'Compliance e documentos' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'CNPJ *' })).not.toBeInTheDocument()
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
    expect(
      await screen.findByRole('heading', { name: 'Compliance e documentos' }),
    ).toBeInTheDocument()
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
    await screen.findByRole('heading', { name: 'Compliance e documentos' })
  })
  it('submits compliance documents and advances to completion', async () => {
    const fetchMock = vi.fn(async (_url, options?: RequestInit) => {
      if (options?.method === 'POST') {
        return response({
          progresso_cadastro_id: id,
          empresa_id: id,
          etapa_atual: 4,
          status_geral: 'EM_ANALISE',
          status_compliance_final: 'PENDENTE',
        })
      }
      return response(saved)
    })
    vi.stubGlobal('fetch', fetchMock)
    open(compliancePath(id))
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Compliance e documentos' })
    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'CONTRATO_SOCIAL')
    await user.upload(
      screen.getByTestId('file-input'),
      new File(['document'], 'contrato.pdf', { type: 'application/pdf' }),
    )

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(
      await screen.findByRole('heading', { name: 'Cadastro enviado para análise' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Passo 4 de 4')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para o login' })).toHaveAttribute('href', '/login')
    const post = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')!
    expect(post[0]).toBe(`/v1/cadastros/${id}/compliance`)
    expect(post[1]?.body).toBeInstanceOf(FormData)
    expect((post[1]?.body as FormData).get('tipo_documento')).toBe('CONTRATO_SOCIAL')
    expect((post[1]?.body as FormData).getAll('documentos')).toHaveLength(1)
  })
  it('keeps compliance selections and reports an API failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, options?: RequestInit) =>
        options?.method === 'POST'
          ? response({ message: 'Documento rejeitado' }, 422)
          : response(saved),
      ),
    )
    open(compliancePath(id))
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Compliance e documentos' })
    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'CONTRATO_SOCIAL')
    await user.upload(
      screen.getByTestId('file-input'),
      new File(['document'], 'contrato.pdf', { type: 'application/pdf' }),
    )

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Documento rejeitado')
    expect(screen.getByText('contrato.pdf')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
  })
  it('recovers when compliance was committed before its response was lost', async () => {
    let committed = false
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, options?: RequestInit) => {
        if (options?.method === 'POST') {
          committed = true
          throw new TypeError('offline')
        }
        return response(committed ? completed : saved)
      }),
    )
    open(compliancePath(id))
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Compliance e documentos' })
    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'CONTRATO_SOCIAL')
    await user.upload(
      screen.getByTestId('file-input'),
      new File(['document'], 'contrato.pdf', { type: 'application/pdf' }),
    )

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(
      await screen.findByRole('heading', { name: 'Cadastro enviado para análise' }),
    ).toBeInTheDocument()
  })
  it.each([
    [companyPath(id), completed, 'Cadastro enviado para análise'],
    [completionPath(id), pending, 'Razão Social *'],
    [completionPath(id), saved, 'Compliance e documentos'],
  ])('redirects %s according to restored progress', async (path, progress, expected) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response(progress)),
    )
    open(path)

    expect(await screen.findByText(expected)).toBeInTheDocument()
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
