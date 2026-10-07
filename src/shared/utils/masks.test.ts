// src/shared/utils/masks.test.ts
import { describe, it, expect } from 'vitest'
import { maskCPF, maskCEP, maskPhone } from './masks'

describe('Utilitários de Máscara', () => {
  describe('maskCPF', () => {
    it('deve formatar CPF progressivamente e aplicar a máscara completa', () => {
      expect(maskCPF('123')).toBe('123')
      expect(maskCPF('1234')).toBe('123.4')
      expect(maskCPF('1234567')).toBe('123.456.7')
      expect(maskCPF('12345678901')).toBe('123.456.789-01')
    })

    it('deve truncar dígitos excedentes além de 11 números', () => {
      expect(maskCPF('12345678901999')).toBe('123.456.789-01')
    })

    it('deve remover caracteres não numéricos', () => {
      expect(maskCPF('123.abc456-def78901')).toBe('123.456.789-01')
    })
  })

  describe('maskCEP', () => {
    it('deve formatar CEP progressivamente', () => {
      expect(maskCEP('12345')).toBe('12345')
      expect(maskCEP('12345678')).toBe('12345-678')
    })

    it('deve truncar dígitos excedentes além de 8 números', () => {
      expect(maskCEP('12345678999')).toBe('12345-678')
    })

    it('deve remover caracteres não numéricos', () => {
      expect(maskCEP('12345-abc678')).toBe('12345-678')
    })
  })

  describe('maskPhone', () => {
    it('deve formatar telefone fixo (10 dígitos) com corte 4-4', () => {
      expect(maskPhone('1132654321')).toBe('(11) 3265-4321')
    })

    it('deve formatar celular (11 dígitos) com corte 5-4', () => {
      expect(maskPhone('11987654321')).toBe('(11) 98765-4321')
    })

    it('deve formatar progressivamente enquanto o usuário digita', () => {
      expect(maskPhone('1')).toBe('1')
      expect(maskPhone('11')).toBe('11')
      expect(maskPhone('119')).toBe('(11) 9')
      expect(maskPhone('1198765')).toBe('(11) 9876-5')
    })

    it('deve truncar dígitos excedentes além de 11 números', () => {
      expect(maskPhone('119876543219999')).toBe('(11) 98765-4321')
    })

    it('deve remover caracteres não numéricos', () => {
      expect(maskPhone('(11) 98765-4321')).toBe('(11) 98765-4321')
    })
  })
})
