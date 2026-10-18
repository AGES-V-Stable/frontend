import AppRoutes from '@/app/AppRoutes'
import { SessionProvider } from '@/features/auth'

export default function App() {
  return (
    <SessionProvider>
      <AppRoutes />
    </SessionProvider>
  )
}
