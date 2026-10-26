/**
 * Visão administrativa do dashboard. O backend ainda não oferece métricas consolidadas
 * (o saldo é do cliente e o volume transacionado responde só à empresa autenticada),
 * então a página informa a indisponibilidade em vez de exibir valores.
 */
export function AdminDashboard() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Visão consolidada da operação da plataforma.</p>
      </div>
      <p role="status" className="rounded-2xl border border-sage-300 bg-white p-6 text-slate-700">
        As métricas consolidadas da plataforma estarão disponíveis em breve.
      </p>
    </div>
  )
}
