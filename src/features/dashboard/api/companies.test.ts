import { afterEach, describe, expect, it, vi } from 'vitest'

import { getCompanyOptions } from '@/features/dashboard/api/companies'

describe('getCompanyOptions', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('names each company by trade name, falling back to the legal name, sorted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 'b', legalName: 'Zeta Comércio Ltda', tradeName: 'Beta', cnpj: '1' },
          { id: 'a', legalName: 'Alfa Indústria Ltda', tradeName: null, cnpj: '2' },
          { id: 'c', legalName: 'Gama Serviços Ltda', tradeName: '  ', cnpj: '3' },
        ]),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getCompanyOptions()).resolves.toEqual([
      { id: 'a', name: 'Alfa Indústria Ltda' },
      { id: 'b', name: 'Beta' },
      { id: 'c', name: 'Gama Serviços Ltda' },
    ])
    expect(fetchMock).toHaveBeenCalledWith('/v1/companies/summaries', expect.anything())
  })

  it('rejects a response outside the contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 1 }]))))

    await expect(getCompanyOptions()).rejects.toThrow()
  })
})
