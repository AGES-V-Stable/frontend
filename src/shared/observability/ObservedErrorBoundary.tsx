import { Component, type ReactNode } from 'react'
import { moduleForPath, reportBrowserEvent } from './browserTelemetry'

export class ObservedErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error) {
    reportBrowserEvent('UI_ERROR', moduleForPath(location.pathname), undefined, error)
  }
  render() {
    if (this.state.failed)
      return (
        <main className="p-8">
          <p role="alert">Não foi possível exibir esta tela.</p>
          <button
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-white"
            onClick={() => location.reload()}
          >
            Recarregar aplicação
          </button>
        </main>
      )
    return this.props.children
  }
}
