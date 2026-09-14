import clockIcon from '@/assets/icon/clock.svg'
import { ComplianceStatus } from './ComplianceStatusType'
import { Button } from '../Button'

export function ComplianceStatusCard({ status }: { status: ComplianceStatus }) {
    switch (status) {
        case ComplianceStatus.EM_ANALISE:
            return (
                <div className='flex flex-col gap-y-5 items-center justify-center py-[61px]'>
                    <img className='p-[22px] bg-[#EFF6FF] rounded-full' src={clockIcon} alt="svg em análise" />
                    <p className='text-[14px] font-medium py-[7px] px-[14px] text-[#0284C7] bg-[#EFF6FF] rounded-[16px]'>Em análise</p>
                    <h1 className='text-[32px] text-[#0F172A] font-bold'>Seu cadastro está em análise</h1>
                    <p className='text-[16px] text-[#64748B] font-regular max-w-[620px] text-center'>Nossa equipe está verificando os dados e documentos enviados. Você será notificado quando houver uma atualização.</p>
                    <div className='bg-[#EFF6FF] border border-[#0284C7] rounded-[16px] w-[600px] h-[96px] p-4'>
                        <h2 className='text-[16px] text-[#0F172A] font-bold'>Análise de compliance em andamento</h2>
                        <p className='text-[14px] text-[#64748B] font-regular'>Não é necessário reenviar documentos neste momento.</p>
                    </div>
                    <div className="max-w-220">
                        <Button label='Atualizar status' variant='secondary' onClick={() => { }} />
                    </div>
                </div>
            )
        case ComplianceStatus.APROVADO:
            return (
                <div>
                    <h1>APROVADO</h1>
                </div>
            )
        case ComplianceStatus.NAO_APROVADO:
            return (
                <div>
                    <h1>NAO_APROVADO</h1>
                </div>
            )
    }
}