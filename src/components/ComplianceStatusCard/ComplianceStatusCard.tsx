import clockIcon from '@/assets/iconClock/clock.svg'
import checkIcon from '@/assets/iconCheck/check.svg'
import closeIcon from '@/assets/iconClose/close.svg'
import { ComplianceStatus } from './ComplianceStatusType'
import { Button } from '../Button'

export function ComplianceStatusCard({ status }: { status: ComplianceStatus }) {
    switch (status) {
        case ComplianceStatus.EM_ANALISE:
            return (
                <div className='flex flex-col gap-y-5 items-center justify-center py-[61px] px-[70px] bg-[#FFFFFF] rounded-[16px] border border-[#BBCABF]'>
                    <img className='p-[22px] bg-[#EFF6FF] rounded-full' src={clockIcon} alt="svg em análise" />
                    <p className='text-[14px] font-medium py-[7px] px-[14px] text-[#0284C7] bg-[#EFF6FF] rounded-[16px]'>Em análise</p>
                    <h1 className='text-[32px] text-[#0F172A] font-bold'>Seu cadastro está em análise</h1>
                    <p className='text-[16px] text-[#64748B] font-regular max-w-[620px] text-center'>Nossa equipe está verificando os dados e documentos enviados. Você será notificado quando houver uma atualização.</p>
                    <div className='bg-[#EFF6FF] border border-[#0284C7] rounded-[16px] w-[600px] h-[96px] p-4'>
                        <h2 className='text-[16px] text-[#0F172A] font-bold'>Análise de compliance em andamento</h2>
                        <p className='text-[14px] text-[#64748B] font-regular'>Não é necessário reenviar documentos neste momento.</p>
                    </div>
                    <div className="max-w-[220px] w-[220px]">
                        <Button label='Atualizar status' variant='secondary' onClick={() => { }} />
                    </div>
                </div>
            )
        case ComplianceStatus.APROVADO:
            return (
                <div className='flex flex-col gap-y-5 items-center justify-center py-[61px] px-[70px] bg-[#FFFFFF] rounded-[16px] border border-[#BBCABF]'>
                    <img className='p-[22px] bg-[#ECFDF5] rounded-full' src={checkIcon} alt="svg em análise" />
                    <p className='text-[14px] font-medium py-[7px] px-[14px] text-[#059669] bg-[#ECFDF5] rounded-[16px]'>Aprovado</p>
                    <h1 className='text-[32px] text-[#0F172A] font-bold'>Cadastro aprovado</h1>
                    <p className='text-[16px] text-[#64748B] font-regular max-w-[620px] text-center'>A análise de compliance foi concluída e sua empresa está autorizada a utilizar a plataforma.</p>
                    <div className='bg-[#ECFDF5] border border-[#059669] rounded-[16px] w-[600px] h-[96px] p-4'>
                        <h2 className='text-[16px] text-[#0F172A] font-bold'>Conta liberada</h2>
                        <p className='text-[14px] text-[#64748B] font-regular'>Você já pode acessar os recursos disponíveis para a sua empresa.</p>
                    </div>
                    <div className="max-w-220 w-[220px]">
                        <Button label='Acessar plataforma' variant='primary' onClick={() => { }} />
                    </div>
                </div>
            )
        case ComplianceStatus.NAO_APROVADO:
            return (
                <div className='flex flex-col gap-y-5 items-center justify-center py-[61px] px-[70px] bg-[#FFFFFF] rounded-[16px] border border-[#BBCABF]'>
                    <img className='p-[22px] bg-[#FEF2F2] rounded-full' src={closeIcon} alt="svg em análise" />
                    <p className='text-[14px] font-medium py-[7px] px-[14px] text-[#DC2626] bg-[#FEF2F2] rounded-[16px]'>Não aprovado</p>
                    <h1 className='text-[32px] text-[#0F172A] font-bold'>Cadastro não aprovado</h1>
                    <p className='text-[16px] text-[#64748B] font-regular max-w-[620px] text-center'>A análise foi concluída, mas encontramos pendências que impedem a aprovação neste momento.</p>
                    <div className='bg-[#FEF2F2] border border-[#DC2626] rounded-[16px] w-[600px] h-[96px] p-4'>
                        <h2 className='text-[16px] text-[#0F172A] font-bold'>Ação necessária</h2>
                        <p className='text-[14px] text-[#64748B] font-regular'>Revise os dados e documentos indicados pela auditoria antes de reenviar.</p>
                    </div>
                    <div className="max-w-220 w-[220px]">
                        <Button label='Revisar dados' variant='primary' onClick={() => { }} />
                    </div>
                </div>
            )
    }
}