import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  downloadStatement,
  getDashboard,
  seriesSchema,
  settlementsSchema,
  summarySchema,
} from './dashboard'
import { TransactionVolumeSchema } from '@/features/dashboard/schemas/transactionVolume'
import {
  realEmptySeries,
  realRemittanceVolume,
  realSettlementsPage,
  realSummary,
  realTransactionVolume,
} from '@/test/fixtures/dashboardResponses'

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

describe('contract with the real backend responses', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('accepts every dashboard response captured from the backend', () => {
    expect(summarySchema.parse(realSummary).amount).toBe('2127.90')
    expect(seriesSchema.parse(realRemittanceVolume).points).toHaveLength(6)
    expect(seriesSchema.parse(realEmptySeries).points).toEqual([])
    expect(TransactionVolumeSchema.parse(realTransactionVolume).transactedVolumeBrl).toBe(
      '152022.50',
    )
    const page = settlementsSchema.parse(realSettlementsPage)
    expect(page.totalElements).toBe(6)
    expect(page.content.map((row) => row.status)).toEqual(['AWAITING_PAYMENT', 'SETTLED'])
  })

  it('sends the period to the client routes and the company only to the administrative ones', async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(
      async () => new Response(JSON.stringify(realSummary)),
    )
    vi.stubGlobal('fetch', fetchMock)
    const filters = { companyId: 'c1', startDate: '2026-06-01', endDate: '2026-11-03' }

    await getDashboard(false, 'summary', filters, summarySchema, new AbortController().signal)
    await getDashboard(true, 'summary', filters, summarySchema, new AbortController().signal)

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/v1/dashboard/summary?startDate=2026-06-01&endDate=2026-11-03',
      '/v1/admin/dashboard/summary?companyId=c1&startDate=2026-06-01&endDate=2026-11-03',
    ])
  })
})
