import { afterEach, expect, it, vi } from 'vitest'
import { createRegistration, saveCompany, submitCompliance } from './registration'
afterEach(() => vi.unstubAllGlobals())
it('trims text without stripping foreign postal codes', async () => {
  const mock = vi.fn(async () => new Response('{}', { status: 201 }))
  vi.stubGlobal('fetch', mock)
  await saveCompany('id', {
    razaoSocial: ' Empresa ',
    pais: ' Canada ',
    cep: ' K1A 0B1 ',
    cnpj: '11.222.333/0001-81',
    cidade: ' Ottawa ',
    estado: ' ON ',
  })
  expect(mock).toHaveBeenCalledWith(
    '/v1/cadastros/id/empresa',
    expect.objectContaining({
      body: JSON.stringify({
        razao_social: 'Empresa',
        pais: 'Canada',
        cnpj: '11222333000181',
        cep: 'K1A 0B1',
        cidade: 'Ottawa',
        estado: 'ON',
      }),
    }),
  )
})

it('normalizes access data and generates an idempotency key', async () => {
  const mock = vi.fn(async () => new Response('{"token":"id"}', { status: 201 }))
  vi.stubGlobal('fetch', mock)

  await createRegistration({
    nomeCompleto: ' Maria Silva ',
    email: ' USER@EXAMPLE.COM ',
    senha: 'segura123!',
    confirmarSenha: 'segura123!',
  })

  expect(mock).toHaveBeenCalledWith(
    '/v1/cadastros/representante/acesso',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
      body: JSON.stringify({
        nomeCompleto: 'Maria Silva',
        email: 'user@example.com',
        senha: 'segura123!',
        confirmarSenha: 'segura123!',
      }),
    }),
  )
})

it('builds a multipart compliance request with all documents', async () => {
  const mock = vi.fn(async (url: string, options?: RequestInit) => {
    expect(url).toBe('/v1/cadastros/id%2Fwith-slash/compliance')
    expect(options?.method).toBe('POST')
    expect(options?.body).toBeInstanceOf(FormData)
    return new Response('{}', { status: 201 })
  })
  vi.stubGlobal('fetch', mock)
  const first = new File(['first'], 'first.pdf', { type: 'application/pdf' })
  const second = new File(['second'], 'second.png', { type: 'image/png' })

  await submitCompliance('id/with-slash', {
    tipoDocumento: 'CONTRATO_SOCIAL',
    documentos: [
      { id: '1', file: first },
      { id: '2', file: second },
    ],
  })

  expect(mock).toHaveBeenCalledOnce()
  const body = mock.mock.calls[0][1]?.body as FormData
  expect(body.get('tipo_documento')).toBe('CONTRATO_SOCIAL')
  expect(body.getAll('documentos')).toEqual([first, second])
})
