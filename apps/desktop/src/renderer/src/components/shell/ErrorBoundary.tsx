import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCw, Home } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// ErrorBoundary — keeps one broken panel from taking down the service.
//
// React unmounts the WHOLE tree when a render throws and nothing catches it.
// That is not a theoretical risk here: a single undefined field on persisted
// data (a destination saved before `streamKey` existed) white-screened the
// entire app on launch, with no message and no way back. During a service that
// is a black screen mid-worship.
//
// Boundaries are placed per route rather than only at the root, so a crash in
// one page leaves the rest of the app — including anything already on air —
// running and reachable.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode
  /** Shown in the fallback so an operator can say WHICH screen failed. */
  label?: string
  /** Root boundaries hide "back to dashboard", having nowhere to go back to. */
  isRoot?: boolean
}

interface State {
  error: Error | null
  info: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ info })

    // Kept as console.error deliberately: it is what surfaces in the packaged
    // app's devtools and in any future crash reporter, which will hook the
    // same channel rather than needing this call site changed.
    console.error(`[GloryCast] Unhandled error in ${this.props.label ?? 'app'}:`, error, info)
  }

  private reset = () => this.setState({ error: null, info: null })

  private goHome = () => {
    this.setState({ error: null, info: null })
    window.location.hash = '#/'
  }

  render() {
    const { error, info } = this.state
    if (!error) return this.props.children

    return (
      <div className="w-full h-full flex items-center justify-center p-8 bg-app">
        <div className="max-w-lg w-full rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-semibold text-white/90">
                {this.props.label ? `${this.props.label} stopped responding` : 'Something went wrong'}
              </h2>
              <p className="text-[12.5px] text-white/50 mt-1 leading-relaxed">
                The rest of GloryCast is still running. Anything already on air has not been
                interrupted — you can retry this screen or move on.
              </p>
            </div>
          </div>

          {/* The message is shown, not hidden behind a details toggle: when a
              volunteer reports a fault mid-service, this is the one line that
              makes it diagnosable. */}
          <div className="rounded-lg bg-well border border-white/[0.06] p-3 mb-4">
            <p className="text-[11px] font-mono text-red-300/90 break-words">{error.message}</p>
            {info?.componentStack && (
              <p className="text-[10px] font-mono text-white/30 mt-2 break-words line-clamp-3">
                {info.componentStack.trim().split('\n')[0]}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={this.reset}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-[12.5px] font-semibold text-white transition-colors"
            >
              <RotateCw size={13} /> Retry
            </button>
            {!this.props.isRoot && (
              <button
                onClick={this.goHome}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[12.5px] text-white/75 transition-colors"
              >
                <Home size={13} /> Dashboard
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="ml-auto text-[11.5px] text-white/40 hover:text-white/70 transition-colors"
            >
              Reload app
            </button>
          </div>
        </div>
      </div>
    )
  }
}
