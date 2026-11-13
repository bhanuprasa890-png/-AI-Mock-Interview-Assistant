import { AlertCircle, TriangleAlert, RotateCcw, X } from 'lucide-react';
import { Button } from './Button';

export function ErrorAlert({
  title = 'Something went wrong',
  message,
  onRetry,
  onDismiss,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="alert"
      className="animate-fade-in flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
    >
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-500" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 leading-relaxed text-rose-700">{message}</p>
        {onRetry ? (
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={onRetry}
            icon={<RotateCcw className="size-3.5" aria-hidden />}
          >
            Try again
          </Button>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="rounded-md p-1 text-rose-500 transition hover:bg-rose-100 hover:text-rose-700"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export function WarningNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function SimulatedBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      title="These results come from the offline simulator, not Google Gemini."
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 font-semibold text-amber-800 ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <TriangleAlert className="size-3" aria-hidden />
      Simulated
    </span>
  );
}
