import { z } from 'zod'

import { httpRequest } from '@/shared/http/httpClient'

export interface CompanyOption {
  id: string
  name: string
}

const CompanySummarySchema = z.object({
  id: z.string(),
  legalName: z.string(),
  tradeName: z.string().nullable(),
})

/** Empresas para o filtro administrativo, por nome fantasia ou razão social, em ordem alfabética. */
export async function getCompanyOptions(signal?: AbortSignal): Promise<CompanyOption[]> {
  const companies = z
    .array(CompanySummarySchema)
    .parse(await httpRequest<unknown>('/v1/companies/summaries', { signal }))
  return companies
    .map((company) => ({ id: company.id, name: company.tradeName?.trim() || company.legalName }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}
