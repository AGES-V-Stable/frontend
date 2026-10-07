import clockIcon from '@/shared/assets/iconClock/clock.svg'
import checkIcon from '@/shared/assets/iconCheck/check.svg'
import closeIcon from '@/shared/assets/iconClose/close.svg'
import { ComplianceStatus } from './ComplianceStatusType'
import { useNavigate } from 'react-router'

import { Button } from '@/shared/components/Button'

export function ComplianceStatusCard({
  status,
  onRefresh,
  refreshing = false,
}: {
  status: ComplianceStatus
  onRefresh?: () => void
  refreshing?: boolean
}) {
  const navigate = useNavigate()

  switch (status) {
    case ComplianceStatus.IN_REVIEW:
      return (
        <div className="flex flex-col gap-y-5 items-center justify-center py-[61px] px-[70px] bg-white rounded-[16px] border border-sage-300">
          <img className="p-[22px] bg-blue-50 rounded-full" src={clockIcon} alt="svg em análise" />
          <p className="text-[14px] font-medium py-[7px] px-[14px] text-sky-600 bg-blue-50 rounded-[16px]">
            Em análise
          </p>
          <h1 className="text-[32px] text-slate-900 font-bold">Seu cadastro está em análise</h1>
          <p className="text-[16px] text-slate-500 font-regular max-w-[620px] text-center">
            Nossa equipe está verificando os dados e documentos enviados. Você será notificado
            quando houver uma atualização.
          </p>
          <div className="bg-blue-50 border border-sky-600 rounded-[16px] w-[600px] h-[96px] p-4">
            <h2 className="text-[16px] text-slate-900 font-bold">
              Análise de compliance em andamento
            </h2>
            <p className="text-[14px] text-slate-500 font-regular">
              Não é necessário reenviar documentos neste momento.
            </p>
          </div>
          <div className="max-w-[220px] w-[220px]">
            <Button
              label={refreshing ? 'Atualizando...' : 'Atualizar status'}
              variant="secondary"
              onClick={onRefresh}
              disabled={refreshing || !onRefresh}
            />
          </div>
        </div>
      )
    case ComplianceStatus.APPROVED:
      return (
        <div className="flex flex-col gap-y-5 items-center justify-center py-[61px] px-[70px] bg-white rounded-[16px] border border-sage-300">
          <img
            className="p-[22px] bg-emerald-50 rounded-full"
            src={checkIcon}
            alt="svg em análise"
          />
          <p className="text-[14px] font-medium py-[7px] px-[14px] text-primary bg-emerald-50 rounded-[16px]">
            Aprovado
          </p>
          <h1 className="text-[32px] text-slate-900 font-bold">Cadastro aprovado</h1>
          <p className="text-[16px] text-slate-500 font-regular max-w-[620px] text-center">
            A análise de compliance foi concluída e sua empresa está autorizada a utilizar a
            plataforma.
          </p>
          <div className="bg-emerald-50 border border-primary rounded-[16px] w-[600px] h-[96px] p-4">
            <h2 className="text-[16px] text-slate-900 font-bold">Conta liberada</h2>
            <p className="text-[14px] text-slate-500 font-regular">
              Você já pode acessar os recursos disponíveis para a sua empresa.
            </p>
          </div>
          <div className="max-w-220 w-[220px]">
            <Button label="Acessar plataforma" variant="primary" onClick={() => navigate('/')} />
          </div>
        </div>
      )
    case ComplianceStatus.NOT_APPROVED:
      return (
        <div className="flex flex-col gap-y-5 items-center justify-center py-[61px] px-[70px] bg-white rounded-[16px] border border-sage-300">
          <img className="p-[22px] bg-red-50 rounded-full" src={closeIcon} alt="svg em análise" />
          <p className="text-[14px] font-medium py-[7px] px-[14px] text-red-600 bg-red-50 rounded-[16px]">
            Não aprovado
          </p>
          <h1 className="text-[32px] text-slate-900 font-bold">Cadastro não aprovado</h1>
          <p className="text-[16px] text-slate-500 font-regular max-w-[620px] text-center">
            A análise foi concluída, mas encontramos pendências que impedem a aprovação neste
            momento.
          </p>
          <div className="bg-red-50 border border-red-600 rounded-[16px] w-[600px] h-[96px] p-4">
            <h2 className="text-[16px] text-slate-900 font-bold">Ação necessária</h2>
            <p className="text-[14px] text-slate-500 font-regular">
              Revise os dados e documentos indicados pela auditoria antes de reenviar.
            </p>
          </div>
          <div className="max-w-220 w-[220px]">
            <Button label="Revisar dados" variant="primary" onClick={() => navigate('/register')} />
          </div>
        </div>
      )
  }
}
