import { ComplianceStatusCard } from '@/components/ComplianceStatusCard/ComplianceStatusCard'

function RegisterStatus() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <ComplianceStatusCard status='EM_ANALISE' />
        </div>
    )
}

export { RegisterStatus }