import { afterEach, describe, expect, it, vi } from 'vitest'

import { startDocumentUpload, submitDocumentResult, uploadFileToS3 } from './compliance'

describe('compliance service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('startDocumentUpload', () => {
    it('posts the document type and doubleSided flag to the compliance endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'doc-1',
          uploadUrlFront: 'https://s3.example.com/front',
          uploadUrlBack: 'https://s3.example.com/back',
        }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await startDocumentUpload('cadastro-1', 'ID', true)

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/onboarding/cadastro-1/compliance/documento'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ documentType: 'ID', doubleSided: true }),
        }),
      )
      expect(result).toEqual({
        id: 'doc-1',
        uploadUrlFront: 'https://s3.example.com/front',
        uploadUrlBack: 'https://s3.example.com/back',
      })
    })

    it('throws when the backend responds with an error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' }),
      )

      await expect(startDocumentUpload('cadastro-1', 'PASSPORT', false)).rejects.toThrow()
    })
  })

  describe('uploadFileToS3', () => {
    it('PUTs the file directly to the presigned url with the conditional-write header', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
      vi.stubGlobal('fetch', fetchMock)
      const file = new File(['conteudo'], 'documento.pdf', { type: 'application/pdf' })

      await uploadFileToS3('https://s3.example.com/front', file)

      expect(fetchMock).toHaveBeenCalledWith('https://s3.example.com/front', {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'application/pdf', 'If-None-Match': '*' },
      })
    })

    it('falls back to a generic content type when the file has none', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
      vi.stubGlobal('fetch', fetchMock)
      const file = new File(['conteudo'], 'documento')

      await uploadFileToS3('https://s3.example.com/front', file)

      expect(fetchMock).toHaveBeenCalledWith(
        'https://s3.example.com/front',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/octet-stream', 'If-None-Match': '*' },
        }),
      )
    })

    it('throws with the response status when the upload is rejected', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
      const file = new File(['conteudo'], 'documento.pdf', { type: 'application/pdf' })

      await expect(uploadFileToS3('https://s3.example.com/front', file)).rejects.toThrow(
        'Falha ao enviar arquivo para o storage (status 403)',
      )
    })
  })

  describe('submitDocumentResult', () => {
    it('PUTs the document id to confirm the upload', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
      vi.stubGlobal('fetch', fetchMock)

      await submitDocumentResult('cadastro-1', 'doc-1')

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/onboarding/cadastro-1/compliance/documento'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ documentoId: 'doc-1' }),
        }),
      )
    })

    it('throws when the backend responds with an error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => 'not found' }),
      )

      await expect(submitDocumentResult('cadastro-1', 'doc-1')).rejects.toThrow()
    })
  })
})
