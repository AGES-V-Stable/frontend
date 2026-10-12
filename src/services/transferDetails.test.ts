import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TransferDetails } from '@/types/transferDetails'

import { saveLoginToken } from './authToken'
import {
  downloadTransferReceipt,
  fileNameFromContentDisposition,
  getTransferDetails,
  saveReceipt,
  TransferDetailsError,
} from './transferDetails'

const ID = '17f2df21-32ed-45b2-b1cc-83146bb39cbb'

const details: TransferDetails = {
  id: ID,
  companyId: 'a0e05887-ddf7-46a4-89ab-84238ed0e6de',
  date: '2026-10-02T19:23:08.95879Z',
  type: 'PAGAMENTO',
  status: 'SETTLED',
  counterpartyName: 'Atlas Imports LLC',
  counterpartyDetails: null,
  source: { amount: '125000.00', currency: 'BRL' },
  destination: { amount: '23062.73', currency: 'USD' },
  fundingSource: 'ACCOUNT_BALANCE',
  exchangeRate: { fromCurrency: 'USD', toCurrency: 'BRL', rate: '5.42' },
  costs: {
    serviceFee: { amount: '562.50', currency: 'BRL', percentage: '0.45' },
    spreadPercentage: null,
    estimatedMarketCost: null,
  },
  estimatedSavings: null,
  receiptAvailable: true,
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const pdf = (disposition?: string, type = 'application/pdf') =>
  new Response(new Blob(['%PDF-1.7']), {
    status: 200,
    headers: {
      'Content-Type': type,
      ...(disposition ? { 'Content-Disposition': disposition } : {}),
    },
  })

describe('transferDetails service', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('getTransferDetails', () => {
    it('requests the details with the bearer token and never sends the company', async () => {
      saveLoginToken('token-value')
      const fetchMock = vi.fn().mockResolvedValue(json(details))
      vi.stubGlobal('fetch', fetchMock)

      await expect(getTransferDetails(ID)).resolves.toEqual(details)

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toMatch(new RegExp(`/api/transferencias/${ID}$`))
      expect(url).not.toContain('companyId')
      expect(options.headers).toEqual({
        Accept: 'application/json',
        Authorization: 'Bearer token-value',
      })
    })

    it('encodes the identifier in the path', async () => {
      const fetchMock = vi.fn().mockResolvedValue(json(details))
      vi.stubGlobal('fetch', fetchMock)

      await getTransferDetails('a/b')

      expect(fetchMock.mock.calls[0]![0]).toContain('/api/transferencias/a%2Fb')
    })

    it('keeps null fields as null instead of inventing values', async () => {
      const sparse = {
        ...details,
        type: null,
        source: { amount: null, currency: 'BRL' },
        exchangeRate: null,
        costs: { serviceFee: null, spreadPercentage: null, estimatedMarketCost: null },
      }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(sparse)))

      const result = await getTransferDetails(ID)

      expect(result.source.amount).toBeNull()
      expect(result.exchangeRate).toBeNull()
      expect(result.costs.serviceFee).toBeNull()
    })

    it('rejects a response outside the contract', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(json({ ...details, source: { amount: 125000 } })),
      )

      await expect(getTransferDetails(ID)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
    })

    it('rejects a non-numeric decimal string', async () => {
      const bad = { ...details, destination: { amount: '12,5', currency: 'USD' } }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(bad)))

      await expect(getTransferDetails(ID)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
    })

    it.each([
      [404, 'TRANSFER_NOT_FOUND'],
      [400, 'INVALID_TRANSFER_ID'],
      [403, 'USER_NOT_VERIFIED'],
      [403, 'COMPANY_ACCESS_REQUIRED'],
      [401, 'UNAUTHENTICATED'],
    ])('maps HTTP %s with code %s', async (status, code) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(json({ code, message: 'texto do backend' }, status)),
      )

      await expect(getTransferDetails(ID)).rejects.toMatchObject({
        name: 'TransferDetailsError',
        status,
        code,
        message: 'texto do backend',
      })
    })

    it('treats any 401 as UNAUTHENTICATED, including the expired token code', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(json({ code: 'TOKEN_EXPIRED', message: 'Session expired' }, 401)),
      )

      await expect(getTransferDetails(ID)).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHENTICATED',
      })
    })

    it('falls back to INTERNAL_ERROR for an unknown code or a non-JSON body', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValueOnce(json({ code: 'OUTRO', message: 'x' }, 500)),
      )
      await expect(getTransferDetails(ID)).rejects.toMatchObject({
        status: 500,
        code: 'INTERNAL_ERROR',
      })

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValueOnce(new Response('<html>erro</html>', { status: 502 })),
      )
      await expect(getTransferDetails(ID)).rejects.toMatchObject({
        status: 502,
        code: 'INTERNAL_ERROR',
      })
    })

    it('reports a network failure without an HTTP status', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

      const error = await getTransferDetails(ID).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(TransferDetailsError)
      expect(error).toMatchObject({ status: null, code: 'NETWORK_ERROR' })
    })

    it('lets an aborted request propagate untouched', async () => {
      const abort = new DOMException('aborted', 'AbortError')
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort))

      await expect(getTransferDetails(ID)).rejects.toBe(abort)
    })
  })

  describe('downloadTransferReceipt', () => {
    it('requests a PDF with the token in the header and returns the file named by the server', async () => {
      saveLoginToken('token-value')
      const fetchMock = vi
        .fn()
        .mockResolvedValue(pdf('attachment; filename="comprovante-transferencia.pdf"'))
      vi.stubGlobal('fetch', fetchMock)

      const file = await downloadTransferReceipt(ID)

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toMatch(new RegExp(`/api/transferencias/${ID}/comprovante$`))
      expect(url).not.toContain('token')
      expect(options.headers).toEqual({
        Accept: 'application/pdf',
        Authorization: 'Bearer token-value',
      })
      expect(file.fileName).toBe('comprovante-transferencia.pdf')
      expect(file.blob.size).toBeGreaterThan(0)
    })

    it('uses comprovante-{id}.pdf when the server gives no name', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pdf()))

      const file = await downloadTransferReceipt(ID)

      expect(file.fileName).toBe(`comprovante-${ID}.pdf`)
    })

    it('sanitizes a hostile file name and keeps the .pdf extension', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(pdf('attachment; filename="../../etc/passwd:x?.txt"')),
      )

      const file = await downloadTransferReceipt(ID)

      expect(file.fileName).toBe('etcpasswdx.txt.pdf')
      expect(file.fileName).not.toMatch(/[\\/:*?"<>|]/)
    })

    it('refuses to hand over JSON or HTML as if it were the receipt', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(pdf('attachment; filename="x.pdf"', 'text/html')),
      )

      await expect(downloadTransferReceipt(ID)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
    })

    it('maps RECEIPT_UNAVAILABLE and provider failures', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(
            json({ code: 'RECEIPT_UNAVAILABLE', message: 'indisponível' }, 409),
          ),
      )
      await expect(downloadTransferReceipt(ID)).rejects.toMatchObject({
        status: 409,
        code: 'RECEIPT_UNAVAILABLE',
      })

      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(json({ code: 'RECEIPT_PROVIDER_ERROR', message: 'falhou' }, 502)),
      )
      await expect(downloadTransferReceipt(ID)).rejects.toMatchObject({
        status: 502,
        code: 'RECEIPT_PROVIDER_ERROR',
      })
    })
  })

  describe('fileNameFromContentDisposition', () => {
    it.each([
      ['attachment; filename="comprovante.pdf"', 'comprovante.pdf'],
      ['attachment; filename=comprovante.pdf', 'comprovante.pdf'],
      [
        "attachment; filename*=UTF-8''comprovante%20transfer%C3%AAncia.pdf",
        'comprovante transferência.pdf',
      ],
      ['attachment', null],
      [null, null],
    ])('extracts the name from %s', (header, expected) => {
      expect(fileNameFromContentDisposition(header)).toBe(expected)
    })
  })

  describe('saveReceipt', () => {
    it('downloads through a temporary link and releases the object URL', () => {
      const create = vi.fn().mockReturnValue('blob:receipt')
      const revoke = vi.fn()
      vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke })
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

      saveReceipt({ blob: new Blob(['%PDF']), fileName: 'comprovante-transferencia.pdf' })

      expect(create).toHaveBeenCalledTimes(1)
      expect(click).toHaveBeenCalledTimes(1)
      expect(revoke).toHaveBeenCalledWith('blob:receipt')
      expect(document.querySelector('a[download]')).toBeNull()
    })
  })
})
