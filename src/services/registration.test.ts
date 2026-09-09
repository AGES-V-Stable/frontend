import { afterEach, expect, it, vi } from 'vitest'
import { saveCompany } from './registration'
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
