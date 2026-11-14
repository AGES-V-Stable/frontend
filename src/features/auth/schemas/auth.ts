import { z } from 'zod'

export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail.')
    .email('Informe um e-mail completo, como nome@empresa.com.br.'),
  password: z.string().min(1, 'Informe a senha.'),
})

export type LoginFormData = z.infer<typeof LoginSchema>

export const LoginResponseSchema = z.object({
  token: z.string().min(1, 'Token ausente na resposta da API'),
})

export type LoginResponseData = z.infer<typeof LoginResponseSchema>
