import { z } from 'zod'
const ComplianceStatusSchema = z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'])
export const OnboardingResultSchema = z.object({
  userId: z.string().min(1),
  companyId: z.string().min(1),
  kycVerificationId: z.string().min(1),
  accessToken: z.string().min(1),
})
export const KycResultSchema = z.object({
  aveniaProcessId: z.string(),
  status: ComplianceStatusSchema,
  resultMessage: z.string().nullish(),
})
export const CurrentOnboardingSchema = z.object({
  kycVerificationId: z.string().min(1),
  companyId: z.string().min(1).nullable(),
  status: ComplianceStatusSchema,
  documentSubmitted: z.boolean(),
  livenessSubmitted: z.boolean(),
})
export const CompanyComplianceStatusSchema = z.object({
  overallStatus: ComplianceStatusSchema.nullable(),
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
