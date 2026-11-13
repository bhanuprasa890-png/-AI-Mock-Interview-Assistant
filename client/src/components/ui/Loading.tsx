import { Loader2, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-slate-500">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </span>
  );
}

export function LoadingBlock({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="card animate-fade-in p-8 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-50">
        <Sparkles className="size-7 animate-pulse text-brand-600" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
      <ul className="mx-auto mt-4 max-w-sm space-y-2 text-left text-sm text-slate-600">
        {steps.map((step, index) => (
          <li key={step} className="flex items-center gap-2.5">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ul>
      <div className="mx-auto mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-1/2 animate-shimmer rounded-full bg-gradient-to-r from-brand-400 via-violet-brand-400 to-brand-400" />
      </div>
    </div>
  );
}

export function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="skeleton h-3.5"
          style={{ width: `${92 - index * 12}%` }}
        />
      ))}
    </div>
  );
}

/** Small inline note used in place of a broken layout region. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-600">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
