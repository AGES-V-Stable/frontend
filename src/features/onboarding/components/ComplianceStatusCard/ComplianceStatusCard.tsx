import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import clockIcon from '@/shared/assets/iconClock/clock.svg'
import checkIcon from '@/shared/assets/iconCheck/check.svg'
import closeIcon from '@/shared/assets/iconClose/close.svg'
import { ComplianceStatus } from '@/features/onboarding/components/ComplianceStatusCard/ComplianceStatusType'
import { Button } from '@/shared/components/Button'
import { TwoFactorAuthContainer } from '@/shared/components/TwoFactorAuth'
import { twoFactorService } from '@/features/auth'

export function ComplianceStatusCard({ status }: { status: ComplianceStatus }) {
  const navigate = useNavigate()
  const [twoFactorActive, setTwoFactorActive] = useState(() => twoFactorService.isActivated())
  const [otpauthUri, setOtpauthUri] = useState<string>(
    'otpauth://totp/V-Stable:cliente@empresa.com?secret=JBSWY3DPEHPK3PXP&issuer=V-Stable',
  )
  const [totpCode, setTotpCode] = useState('')
  const [totpError, setTotpError] = useState('')
  const [isActivating, setIsActivating] = useState(false)

  useEffect(() => {
    if (status !== ComplianceStatus.APPROVED || twoFactorActive) return
    const controller = new AbortController()
    void twoFactorService
      .setup(controller.signal)
      .then((res) => {
        if (!controller.signal.aborted && res.otpauthUri) {
          setOtpauthUri(res.otpauthUri)
        }
      })
      .catch(() => {
        // Fallback mantido pelo service
      })
    return () => controller.abort()
  }, [status, twoFactorActive])

  async function handleActivate2fa(code: string) {
    if (code.length !== 6 || isActivating) return
    setIsActivating(true)
    setTotpError('')
    try {
      await twoFactorService.activate(code)
      setTwoFactorActive(true)
      navigate('/')
    } catch (error) {
      setTotpError(
        error instanceof Error && error.message
          ? error.message
          : 'Código de autenticação inválido ou expirado.',
      )
    } finally {
      setIsActivating(false)
    }
  }

  switch (status) {
    case ComplianceStatus.IN_REVIEW:
      return (
        <div className="flex flex-col gap-y-5 items-center justify-center py-[61px] px-[70px] bg-white rounded-[16px] border border-sage-300">
          <img className="p-[22px] bg-blue-50 rounded-full" src={clockIcon} alt="Em análise" />
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
            <Button label="Atualizar status" variant="secondary" onClick={() => {}} />
          </div>
        </div>
      )
    case ComplianceStatus.APPROVED:
      if (!twoFactorActive) {
        return (
          <div className="flex flex-col gap-y-5 items-center justify-center py-[50px] px-6 md:px-[70px] bg-white rounded-[16px] border border-sage-300 max-w-2xl w-full">
            <img className="p-[22px] bg-emerald-50 rounded-full" src={checkIcon} alt="Aprovado" />
            <p className="text-[14px] font-medium py-[7px] px-[14px] text-primary bg-emerald-50 rounded-[16px]">
              Cadastro Aprovado
            </p>
            <h1 className="text-[28px] text-slate-900 font-bold text-center">
              Ativação de Segurança Obrigatória
            </h1>
            <p className="text-[15px] text-slate-600 text-center max-w-[540px]">
              Sua análise foi concluída com sucesso! Para liberar seu acesso ao painel da V-Stable,
              configure a autenticação em duas etapas (2FA) escaneando o QR Code abaixo:
            </p>

            <div className="w-full text-left mt-2">
              <TwoFactorAuthContainer
                otpauthUri={otpauthUri}
                title="Configuração de Segurança em Duas Etapas (2FA)"
                description="Abra seu aplicativo autenticador no celular e escaneie o QR Code para gerar seu código de acesso:"
                value={totpCode}
                onChange={(val) => {
                  setTotpCode(val)
                  if (totpError) setTotpError('')
                }}
                onVerify={handleActivate2fa}
                error={totpError}
                loading={isActivating}
                submitLabel="Ativar 2FA e Acessar Plataforma"
              />
            </div>
          </div>
        )
      }

      return (
        <div className="flex flex-col gap-y-5 items-center justify-center py-[61px] px-[70px] bg-white rounded-[16px] border border-sage-300">
          <img className="p-[22px] bg-emerald-50 rounded-full" src={checkIcon} alt="Aprovado" />
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
          <img className="p-[22px] bg-red-50 rounded-full" src={closeIcon} alt="Não aprovado" />
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
