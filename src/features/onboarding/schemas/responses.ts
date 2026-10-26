import { z } from 'zod'
export const OnboardingResultSchema = z.object({
  userId: z.string().min(1),
  companyId: z.string().min(1),
  kycVerificationId: z.string().min(1),
  accessToken: z.string().min(1),
})
export const KycResultSchema = z.object({
  aveniaProcessId: z.string(),
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']),
  resultMessage: z.string().nullish(),
})
export const DocumentUploadSchema = z.object({
  id: z.string().min(1),
  uploadUrlFront: z.url(),
  uploadUrlBack: z.url().nullish(),
})
export const StartLivenessSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  livenessUrl: z.url(),
  validateLivenessToken: z.string().min(1),
})
export const LivenessStatusSchema = z.object({ ready: z.boolean(), status: z.string() })

export const PersonalDataSchema = z.object({
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  dateOfBirth: z.string(),
  taxIdNumber: z.string(),
  country: z.string(),
  state: z.string(),
  city: z.string(),
  zipCode: z.string(),
  streetAddress: z.string(),
})
