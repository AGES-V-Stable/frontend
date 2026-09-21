import { z } from 'zod'

// Mesma regra do backend (OnboardingService.STRONG_PASSWORD_PATTERN): pelo
// menos 8 caracteres, incluindo um número e um caractere especial.
const STRONG_PASSWORD_PATTERN = /^(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/

export const RepresentativeAccessSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Nome completo é obrigatório'),
    email: z.string().trim().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
    password: z
      .string()
      .min(1, 'Senha é obrigatória')
      .regex(
        STRONG_PASSWORD_PATTERN,
        'Senha deve ter ao menos 8 caracteres, incluindo número e caractere especial',
      ),
    confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senha e confirmação não coincidem',
    path: ['confirmPassword'],
  })

export type RepresentativeAccessFormData = z.infer<typeof RepresentativeAccessSchema>
