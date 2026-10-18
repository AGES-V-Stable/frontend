import { BeneficiaryList } from '@/features/beneficiaries/components/BeneficiaryList'
export default function BeneficiaryView() {
  return (
    <section className="px-6 py-8 lg:px-10">
      <BeneficiaryList
        title="Beneficiários"
        subtitle="Consulta global de beneficiários cadastrados na plataforma."
      />
    </section>
  )
}
