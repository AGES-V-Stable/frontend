import { describe, expect, it } from 'vitest'
import { resolvedInvitation } from '@/test/fixtures/companyInvitation'
import {
  InvitationSchema,
  passwordPolicyError,
  TERMS_REQUIRED_MESSAGE,
  validateNewUserForm,
} from './invitation'

describe('passwordPolicyError', () => {
  it.each(['Segura123!', 'abcdef1@', 'çãõéü1#x'])('accepts the valid password %s', (password) => {
    expect(passwordPolicyError(password)).toBeUndefined()
  })

  it.each([
    ['too short', 'Ab1!xyz'],
    ['without a number', 'SemNumero!!'],
    ['without a special character', 'SemEspecial123'],
  ])('rejects a password %s', (_scenario, password) => {
    expect(passwordPolicyError(password)).toBe(
      'Use ao menos 8 caracteres, um número e um caractere especial.',
    )
  })

  it.each([
    ['LF', '\n'],
    ['CR', '\r'],
    ['NEL', String.fromCharCode(0x85)],
    ['LINE SEPARATOR', String.fromCharCode(0x2028)],
    ['PARAGRAPH SEPARATOR', String.fromCharCode(0x2029)],
  ])('rejects the %s line break, like the backend policy', (_name, lineBreak) => {
    expect(passwordPolicyError(`Segura123!${lineBreak}mais`)).toBe(
      'A senha não pode conter quebras de linha.',
    )
  })

  it('counts the minimum length in UTF-16 units, like Java String.length()', () => {
    // Given three emoji (two UTF-16 units each) plus a digit and a special character
    expect(passwordPolicyError('😀😀😀1!')).toBeUndefined()
    expect(passwordPolicyError('😀😀1!x')).toMatch(/ao menos 8 caracteres/)
  })

  it('treats a space as a special character, like the backend policy', () => {
    expect(passwordPolicyError('Segura 123')).toBeUndefined()
  })

  it('limits the password to 72 UTF-8 bytes, not 72 characters', () => {
    // Given two-byte characters: 37 characters already reach 72 bytes
    const atLimit = `${'é'.repeat(35)}1!`
    const overLimit = `${'é'.repeat(36)}1!`

    expect(new TextEncoder().encode(atLimit).length).toBe(72)
    expect(passwordPolicyError(atLimit)).toBeUndefined()
    expect(passwordPolicyError(overLimit)).toBe(
      'A senha excede o tamanho máximo permitido. Use uma senha mais curta.',
    )
    expect(passwordPolicyError(`${'a'.repeat(70)}1!`)).toBeUndefined()
    expect(passwordPolicyError(`${'a'.repeat(71)}1!`)).toMatch(/tamanho máximo/)
  })
})

describe('validateNewUserForm', () => {
  it('requires the password, a matching confirmation and the explicit terms acceptance', () => {
    expect(
      validateNewUserForm({ password: '', confirmPassword: '', termsAccepted: false }),
    ).toEqual({
      password: 'Informe uma senha.',
      confirmPassword: 'Confirme a senha.',
      termsAccepted: TERMS_REQUIRED_MESSAGE,
    })
    expect(
      validateNewUserForm({
        password: 'Segura123!',
        confirmPassword: 'Outra123!',
        termsAccepted: true,
      }),
    ).toEqual({ confirmPassword: 'Senha e confirmação não coincidem.' })
  })

  it('accepts a complete form', () => {
    expect(
      validateNewUserForm({
        password: 'Segura123!',
        confirmPassword: 'Segura123!',
        termsAccepted: true,
      }),
    ).toEqual({})
  })
})

describe('InvitationSchema', () => {
  it('parses the resolve contract', () => {
    expect(InvitationSchema.parse(resolvedInvitation)).toEqual(resolvedInvitation)
  })

  it('rejects an owner role, since invitations never grant ownership', () => {
    expect(InvitationSchema.safeParse({ ...resolvedInvitation, role: 'OWNER' }).success).toBe(false)
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,<p>x</p>',
    '//evil.example/termos',
    'http://inseguro.example/termos',
  ])('rejects the unsafe terms link %s', (termsUrl) => {
    const terms = { ...resolvedInvitation.terms, termsUrl }
    expect(InvitationSchema.safeParse({ ...resolvedInvitation, terms }).success).toBe(false)
  })

  it('accepts HTTPS terms links', () => {
    const terms = { ...resolvedInvitation.terms, privacyUrl: 'https://vstable.example/privacidade' }
    expect(InvitationSchema.safeParse({ ...resolvedInvitation, terms }).success).toBe(true)
  })

  it('accepts absolute links on the frontend origin, the backend default in development', () => {
    // Given the backend default `${INVITATION_FRONTEND_ORIGIN}/termos-de-uso` over plain HTTP
    const origin = window.location.origin
    expect(origin.startsWith('http://')).toBe(true)
    const terms = {
      version: 'v1',
      termsUrl: `${origin}/termos-de-uso`,
      privacyUrl: `${origin}/politica-de-privacidade`,
    }

    expect(InvitationSchema.safeParse({ ...resolvedInvitation, terms }).success).toBe(true)
  })
})
