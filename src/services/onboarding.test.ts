import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAccessToken } from './authToken'
import {
  ApiError,
  clearRepresentativePersonalData,
  getRepresentativePersonalData,
  saveRepresentativePersonalData,
  submitKyc,
  submitOnboarding,
} from './onboarding'
import type { RepresentativeData } from '@/types/onboarding'
import type { CompanyData } from '@/types/registration'

const representative: RepresentativeData = {
  fullName: 'Maria Silva',
  email: 'maria@empresa.com',
  password: 'segura123!',
  confirmPassword: 'segura123!',
  cargoFuncao: 'Diretor(a)',
  participacaoSocietaria: 50,
  cpf: '52998224725',
  dateOfBirth: '1990-01-01',
  phone: '11987654321',
  pais: 'Brasil',
  cep: '90000-000',
  cidade: 'São Paulo',
  estado: 'SP',
  linhaEndereco: 'Rua Teste, 100',
}

const company: CompanyData = {
  razaoSocial: 'Empresa Ltda.',
  pais: 'Brasil',
  cnpj: '11.222.333/0001-81',
  cep: '90000-000',
  cidade: '',
  estado: 'RS',
}

describe('onboarding service', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('submitOnboarding', () => {
    it('posts the mapped representative and company data and saves the returned access token', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          userId: 'user-1',
          companyId: 'company-1',
          kycVerificationId: 'kyc-1',
          accessToken: 'token-abc',
        }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await submitOnboarding(representative, company)

      expect(fetchMock).toHaveBeenCalledWith(
        '/v1/onboarding',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            fullName: 'Maria Silva',
            email: 'maria@empresa.com',
            password: 'segura123!',
            confirmPassword: 'segura123!',
            legalName: 'Empresa Ltda.',
            cnpj: '11222333000181',
            country: 'Brasil',
            zipCode: '90000000',
            city: undefined,
            state: 'RS',
          }),
        }),
      )
      expect(result.accessToken).toBe('token-abc')
      expect(getAccessToken()).toBe('token-abc')
    })

    it('keeps the raw zip code for a non-Brazilian address', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({
            userId: 'user-1',
            companyId: 'company-1',
            kycVerificationId: 'kyc-1',
            accessToken: 'token-abc',
          }),
        }),
      )

      await submitOnboarding(representative, { ...company, pais: 'Canada', cep: 'K1A 0B1' })

      const [, options] = vi.mocked(fetch).mock.calls[0]!
      expect(JSON.parse(options!.body as string)).toEqual(
        expect.objectContaining({ country: 'Canada', zipCode: 'K1A 0B1' }),
      )
    })

    it('throws an ApiError with the backend message when the request fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 422,
          json: async () => ({ message: 'CPF já usado em outro cadastro' }),
        }),
      )

      await expect(submitOnboarding(representative, company)).rejects.toMatchObject({
        status: 422,
        message: 'CPF já usado em outro cadastro',
      })
    })

    it('falls back to a generic message when the error body has no message', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: async () => {
            throw new Error('not json')
          },
        }),
      )

      await expect(submitOnboarding(representative, company)).rejects.toThrow(
        'Não foi possível concluir a solicitação. Tente novamente.',
      )
    })
  })

  describe('submitKyc', () => {
    it('posts the personal data to the kyc endpoint with the stored access token', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ aveniaProcessId: 'process-1', status: 'APPROVED' }),
      })
      vi.stubGlobal('fetch', fetchMock)
      sessionStorage.setItem('vstable:onboarding:access-token', 'token-abc')

      const personal = {
        fullName: 'Maria Silva',
        email: 'maria@empresa.com',
        phone: '11987654321',
        dateOfBirth: '1990-01-01',
        taxIdNumber: '52998224725',
        country: 'Brasil',
        state: 'SP',
        city: 'São Paulo',
        zipCode: '90000000',
        streetAddress: 'Rua Teste, 100',
      }

      const result = await submitKyc('kyc-1', personal)

      expect(fetchMock).toHaveBeenCalledWith(
        '/v1/onboarding/kyc-1/compliance/kyc',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer token-abc' }),
          body: JSON.stringify(personal),
        }),
      )
      expect(result).toEqual({ aveniaProcessId: 'process-1', status: 'APPROVED' })
    })
  })

  describe('ApiError', () => {
    it('carries the http status alongside the message', () => {
      const error = new ApiError(422, 'Dados inválidos')

      expect(error.status).toBe(422)
      expect(error.message).toBe('Dados inválidos')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('representative personal data storage', () => {
    it('returns null when nothing was saved', () => {
      expect(getRepresentativePersonalData()).toBeNull()
    })

    it('round-trips the saved personal data', () => {
      const personal = {
        fullName: 'Maria Silva',
        email: 'maria@empresa.com',
        phone: '11987654321',
        dateOfBirth: '1990-01-01',
        taxIdNumber: '52998224725',
        country: 'Brasil',
        state: 'SP',
        city: 'São Paulo',
        zipCode: '90000000',
        streetAddress: 'Rua Teste, 100',
      }

      saveRepresentativePersonalData(personal)

      expect(getRepresentativePersonalData()).toEqual(personal)
    })

    it('removes the saved data when cleared', () => {
      saveRepresentativePersonalData({
        fullName: 'Maria Silva',
        email: 'maria@empresa.com',
        phone: '11987654321',
        dateOfBirth: '1990-01-01',
        taxIdNumber: '52998224725',
        country: 'Brasil',
        state: 'SP',
        city: 'São Paulo',
        zipCode: '90000000',
        streetAddress: 'Rua Teste, 100',
      })

      clearRepresentativePersonalData()

      expect(getRepresentativePersonalData()).toBeNull()
    })
  })
})
