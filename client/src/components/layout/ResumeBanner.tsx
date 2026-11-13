import { ArrowRight, History, X } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { readActiveOrNull, useInterview } from '../../context/InterviewContext';

/**
 * Shown on the landing and setup pages when an unfinished interview exists,
 * so users do not accidentally lose progress or wonder where they left off.
 */
export function ResumeBanner() {
  const { hasActive, resumeInterview } = useInterview();
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);

  const hidden =
    dismissed ||
    !hasActive ||
    ['/interview', '/results', '/history'].some((path) => location.pathname.startsWith(path));

  if (hidden) return null;

  const active = readActiveOrNull();
  const answered = active?.items.length ?? 0;
  const total = active?.questions.length ?? 5;

  return (
    <div className="border-b border-brand-100 bg-brand-50/70">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
        <History className="size-4 shrink-0 text-brand-600" aria-hidden />
        <p className="min-w-0 flex-1 text-xs text-brand-900 sm:text-sm">
          You have an unfinished interview
          {active ? (
            <>
              {' '}
              - <span className="font-semibold">{active.config.role}</span>, {answered}/{total} answered
            </>
          ) : null}
          .
        </p>
        <button
          type="button"
          onClick={() => {
            resumeInterview();
            navigate('/interview');
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
        >
          Resume
          <ArrowRight className="size-3" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="rounded-md p-1 text-brand-500 transition hover:bg-brand-100 hover:text-brand-700"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
