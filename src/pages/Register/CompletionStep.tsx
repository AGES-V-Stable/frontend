import { Link } from 'react-router'
import { PATHS } from '@/routes/paths'
import { RegistrationHeader } from './RegistrationHeader'

export function CompletionStep() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 rounded-xl border border-sage-300 bg-white px-4 py-[30px] md:px-10">
        <RegistrationHeader
          activeStep={4}
          description="A submissão do cadastro institucional foi concluída."
        />
        <section className="mx-auto w-full max-w-xl py-10 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-primary">
            ✓
          </div>
          <h2 className="mt-5 text-2xl font-bold text-slate-900">Cadastro enviado para análise</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Recebemos os dados e documentos da empresa. O acesso será liberado após a análise de
            compliance.
          </p>
          <Link
            to={PATHS.LOGIN}
            className="mt-7 inline-flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3 text-white hover:bg-primary-hover"
          >
            Ir para o login
          </Link>
        </section>
      </div>
    </main>
  )
}
