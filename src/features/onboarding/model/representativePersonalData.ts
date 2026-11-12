import type { CompanyData, RepresentativeData } from '../types/registration'
import type { KycPersonalPayload } from '../types/onboarding'

/**
 * Dados pessoais do representante guardados na aba para finalizar o KYC na Avenia; o backend
 * não os persiste. O CEP brasileiro vai só com dígitos, como no cadastro da empresa.
 */
export function representativePersonalData(
  person: { fullName: string; email: string },
  representative: RepresentativeData,
  company: CompanyData,
): KycPersonalPayload {
  const isBrazil = company.pais.trim().toLowerCase() === 'brasil'
  return {
    fullName: person.fullName.trim(),
    email: person.email.trim(),
    phone: representative.phone.replace(/\D/g, ''),
    dateOfBirth: representative.date_of_birth,
    taxIdNumber: representative.cpf.replace(/\D/g, ''),
    country: representative.pais.trim(),
    state: representative.estado.trim(),
    city: representative.cidade.trim(),
    zipCode: isBrazil ? representative.cep.replace(/\D/g, '') : representative.cep.trim(),
    streetAddress: representative.linha_endereco.trim(),
  }
}
