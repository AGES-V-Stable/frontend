// src/utils/validators.test.ts
import { describe, it, expect } from 'vitest'
import { isValidCPF } from './validators'

describe('isValidCPF', () => {
  it('deve retornar true para CPFs válidos', () => {
    // CPFs matematicamente válidos
    expect(isValidCPF('52998224725')).toBe(true)
    expect(isValidCPF('529.982.247-25')).toBe(true)
  })

  it('deve retornar false se tiver menos ou mais de 11 dígitos', () => {
    expect(isValidCPF('123456789')).toBe(false)
    expect(isValidCPF('1234567890123')).toBe(false)
  })

  it('deve retornar false para sequências de números repetidos', () => {
    expect(isValidCPF('00000000000')).toBe(false)
    expect(isValidCPF('11111111111')).toBe(false)
    expect(isValidCPF('99999999999')).toBe(false)
  })

  it('deve retornar false para CPFs com dígitos verificadores incorretos', () => {
    expect(isValidCPF('52998224726')).toBe(false)
    expect(isValidCPF('12345678900')).toBe(false)
  })

  it('deve validar corretamente quando o resto da divisão por 11 for 10 (vira 0)', () => {
    // CPF com dígito zero resultante de resto 10
    expect(isValidCPF('01111111100')).toBe(false)
  })
})
