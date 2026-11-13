import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Catches render-time crashes so a bug never leaves a blank white page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[InterviewMate] render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-md p-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-rose-50">
            <AlertTriangle className="size-6 text-rose-600" aria-hidden />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-slate-900">Something broke on this page</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Your saved interviews are safe. Reload the page to keep going - if it happens again,
            open the browser console and check the error.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <RefreshCcw className="size-4" aria-hidden />
            Reload
          </button>
        </div>
      </div>
    );
  }
}
