import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { saveAccessToken } from './authToken'
import { getTransfers, getTransfersById, toTransfer, type ApiTransfer } from './transfers'

const apiTransfer: ApiTransfer = {
  id: 't1',
  companyId: 'c1',
  companyName: 'Tech Corp',
  direction: 'PAYMENT',
  beneficiaryId: 'b1',
  counterpartyName: 'Atlas Imports LLC',
  transferMethod: 'PIX',
  status: 'SETTLED',
  foreignCurrency: 'USD',
  foreignAmount: '23062.73',
  settlementAmountBrl: '118080.10',
  serviceFeeBrl: '45.00',
  exchangeRate: '5.120000',
  createdAt: '2026-08-24T12:00:00Z',
  settledAt: null,
}

const springPage = (content: ApiTransfer[], number = 0) => ({
  content,
  totalElements: content.length,
  totalPages: 1,
  number,
  size: 3,
})

const okJson = (body: unknown) => vi.fn().mockResolvedValue({ ok: true, json: async () => body })

describe('getTransfers service', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('calls GET /v1/transfers with a zero-based page and adapts the Spring page', async () => {
    saveAccessToken('admin-token')
    const fetchMock = okJson(springPage([apiTransfer], 0))
    vi.stubGlobal('fetch', fetchMock)

    const result = await getTransfers(1, 3)

    expect(result).toEqual({
      data: [toTransfer(apiTransfer)],
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/transfers?page=0&size=3',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }),
      }),
    )
  })

  it('throws an ApiError when the response is not OK (no fallback)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }),
    )

    await expect(getTransfers(1, 3)).rejects.toMatchObject({ status: 403 })
  })

  it('propagates network errors (no fallback)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')))

    await expect(getTransfers(1, 3)).rejects.toThrow('Network failure')
  })

  it('rejects a payload that is not a page', async () => {
    vi.stubGlobal('fetch', okJson({ algoErrado: true }))

    await expect(getTransfers(1, 3)).rejects.toThrow('Formato inválido retornado pela API')
  })

  it('does not send empty filters', async () => {
    const fetchMock = okJson(springPage([]))
    vi.stubGlobal('fetch', fetchMock)

    await getTransfers(1, 3, {
      search: '',
      beneficiary: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      status: '',
      type: '',
    })

    expect(fetchMock).toHaveBeenCalledWith('/v1/transfers?page=0&size=3', expect.any(Object))
  })

  it('translates status and type labels to the backend enum codes', async () => {
    const fetchMock = okJson(springPage([], 1))
    vi.stubGlobal('fetch', fetchMock)

    await getTransfers(2, 12, {
      search: 'Tech',
      beneficiary: 'Atlas',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      minAmount: '100',
      maxAmount: '5000',
      status: 'Concluída',
      type: 'Recebimento',
    })

    const [url] = fetchMock.mock.calls[0]!
    const params = new URL(url as string, 'http://localhost').searchParams
    expect(Object.fromEntries(params)).toEqual({
      page: '1',
      size: '12',
      search: 'Tech',
      beneficiary: 'Atlas',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      minAmount: '100',
      maxAmount: '5000',
      status: 'SETTLED',
      direction: 'RECEIPT',
    })
  })
})

describe('getTransfersById service', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads and adapts a single transfer', async () => {
    const fetchMock = okJson(apiTransfer)
    vi.stubGlobal('fetch', fetchMock)

    await expect(getTransfersById('t1')).resolves.toEqual(toTransfer(apiTransfer))
    expect(fetchMock).toHaveBeenCalledWith('/v1/transfers/t1', expect.any(Object))
  })

  it('throws when the API fails (no fallback)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }),
    )

    await expect(getTransfersById('t99')).rejects.toMatchObject({ status: 404 })
  })

  it('throws when the payload has no id', async () => {
    vi.stubGlobal('fetch', okJson({}))

    await expect(getTransfersById('t99')).rejects.toThrow('Formato inválido retornado pela API')
  })
})

describe('toTransfer', () => {
  it('maps decimal strings, direction and every backend status to explicit labels', () => {
    expect(toTransfer(apiTransfer)).toEqual({
      id: 't1',
      empresa: 'Tech Corp',
      beneficiario: 'Atlas Imports LLC',
      data: '2026-08-24T12:00:00Z',
      tipo: 'Pagamento',
      valor: 23062.73,
      moeda: 'USD',
      status: 'Concluída',
      cotacao: 5.12,
      custos: 45,
      economia: undefined,
    })
    expect(toTransfer({ ...apiTransfer, status: 'HELD', direction: 'RECEIPT' })).toMatchObject({
      status: 'Retida',
      tipo: 'Recebimento',
    })
    expect(toTransfer({ ...apiTransfer, status: 'PARTIAL_FAILURE' }).status).toBe('Falha parcial')
  })

  it('handles missing optional values', () => {
    expect(
      toTransfer({
        ...apiTransfer,
        companyName: null,
        counterpartyName: null,
        exchangeRate: null,
        serviceFeeBrl: null,
      }),
    ).toMatchObject({ empresa: '—', beneficiario: '—', cotacao: undefined, custos: undefined })
  })
})
