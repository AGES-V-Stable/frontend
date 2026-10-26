import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { downloadStatement } from './dashboard'

// Corpo em texto: no jsdom, o Response não reconhece o Blob do ambiente de teste.
function pdfResponse(body: string, contentType = 'application/pdf') {
  return new Response(body, { headers: { 'Content-Type': contentType } })
}

describe('downloadStatement', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:extrato'),
      revokeObjectURL: vi.fn(),
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('downloads the PDF returned by the backend as extrato-vstable.pdf and releases the URL', async () => {
    const fetcher = vi.fn(async () => pdfResponse('%PDF-1.4'))
    vi.stubGlobal('fetch', fetcher)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await downloadStatement()

    expect(fetcher).toHaveBeenCalledWith(
      '/v1/dashboard/statement.pdf',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/pdf' }) }),
    )
    expect(click).toHaveBeenCalledTimes(1)
    const link = click.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toBe('extrato-vstable.pdf')
    expect(link.isConnected).toBe(false)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:extrato')
  })

  it('rejects a response that is not a PDF', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => pdfResponse('{}', 'application/json')),
    )

    await expect(downloadStatement()).rejects.toThrow('O servidor não retornou um PDF.')
  })

  it('rejects an empty statement', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => pdfResponse('')),
    )

    await expect(downloadStatement()).rejects.toThrow('Extrato vazio.')
  })
})
