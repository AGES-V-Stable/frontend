import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import App from '@/App'
import '@/index.css'
import { installBrowserTelemetry } from '@/shared/observability/browserTelemetry'
import { ObservedErrorBoundary } from '@/shared/observability/ObservedErrorBoundary'

const uninstallTelemetry = installBrowserTelemetry()
if (import.meta.hot) import.meta.hot.dispose(uninstallTelemetry)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ObservedErrorBoundary>
        <App />
      </ObservedErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
