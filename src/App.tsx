import AppRoutes from '@/routes/AppRoutes'
import { UnauthorizedRedirect } from '@/routes/guards'

function App() {
  return (
    <>
      <UnauthorizedRedirect />
      <AppRoutes />
    </>
  )
}

export default App
