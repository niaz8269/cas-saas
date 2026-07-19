import { Component, type ReactNode } from "react"

import { reportClientError } from "@/lib/errorReporting"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Catches render-time errors anywhere below it, reports them to the error
 * monitor, and shows a calm fallback instead of a blank screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error): void {
    reportClientError({ name: error.name, message: error.message, stack: error.stack })
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-subtle p-6 text-center">
        <p className="text-lg font-semibold text-cas-navy">Something went wrong</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          The error has been logged for our team. Reloading usually fixes it.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-cas-navy px-4 py-2 text-sm font-medium text-white hover:bg-cas-navy-700"
        >
          Reload
        </button>
      </div>
    )
  }
}
