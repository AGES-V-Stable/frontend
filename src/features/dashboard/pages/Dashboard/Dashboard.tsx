import { BalanceCard } from '@/features/dashboard/components/BalanceCard'
import { TransactionVolumeCard } from '@/features/dashboard/components/TransactionVolumeCard'
import { useBalance } from '@/features/dashboard/hooks/useBalance'
import { useTransactionVolume } from '@/features/dashboard/hooks/useTransactionVolume'

/** Métricas da empresa do cliente (épico AGES-V-Stable/cicd#44): saldo (#43) e volume (#53). */
export function Dashboard() {
  const balance = useBalance()
  const volume = useTransactionVolume()

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Acompanhe os principais números da sua empresa.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <BalanceCard state={balance.state} onRetry={balance.retry} />
        <TransactionVolumeCard state={volume.state} onRetry={volume.retry} />
      </div>
    </div>
  )
}
