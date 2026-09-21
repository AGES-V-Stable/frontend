import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().trim().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export type LoginFormData = z.infer<typeof LoginSchema>

export const LoginResponseSchema = z.object({
  token: z.string().min(1, 'Token ausente na resposta da API'),
})

export type LoginResponseData = z.infer<typeof LoginResponseSchema>
