import { describe, expect, it } from 'vitest'
import { InvitationFormSchema } from './members'

const valid = { name: 'Bruno Alves', email: 'bruno@empresa.com', role: 'OPERATOR' }
const firstMessage = (input: unknown) => {
  const result = InvitationFormSchema.safeParse(input)
  return result.success ? null : result.error.issues[0]!.message
}

describe('InvitationFormSchema', () => {
  it('trims the name and trims and lowercases the e-mail like the backend', () => {
    const result = InvitationFormSchema.parse({
      name: '  Bruno Alves  ',
      email: '  Bruno.Alves+Time@Empresa.COM ',
      role: 'VIEWER',
    })
    expect(result).toEqual({
      name: 'Bruno Alves',
      email: 'bruno.alves+time@empresa.com',
      role: 'VIEWER',
    })
  })

  it.each([
    [{ ...valid, name: '   ' }, 'Informe o nome da pessoa.'],
    [{ ...valid, name: 'B' }, 'O nome deve ter pelo menos 2 caracteres.'],
    [{ ...valid, name: 'B'.repeat(256) }, 'O nome deve ter até 255 caracteres.'],
    [{ ...valid, name: 'Bruno\u0007' }, 'O nome não pode ter caracteres de controle.'],
    [{ ...valid, email: ' ' }, 'Informe o e-mail da pessoa.'],
    [{ ...valid, email: 'bruno@' }, 'Informe um e-mail válido.'],
    [{ ...valid, email: `${'a'.repeat(250)}@x.com` }, 'O e-mail deve ter até 255 caracteres.'],
    [{ ...valid, role: '' }, 'Escolha o perfil de acesso.'],
  ])('rejects %j with "%s"', (input, message) => {
    expect(firstMessage(input)).toBe(message)
  })

  it('never accepts the owner role for an invitation', () => {
    expect(firstMessage({ ...valid, role: 'OWNER' })).toBe('Escolha o perfil de acesso.')
  })
})
