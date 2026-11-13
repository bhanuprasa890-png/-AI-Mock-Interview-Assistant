import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Home,
  Lightbulb,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MAX_TOTAL_SCORE } from '@shared/types';
import { Button, LinkButton } from '../components/ui/Button';
import { ErrorAlert, SimulatedBadge } from '../components/ui/Feedback';
import { LoadingBlock } from '../components/ui/Loading';
import { ProgressBar, RadialScore } from '../components/ui/ProgressBar';
import { useInterview } from '../context/InterviewContext';
import { DIMENSION_LABELS, formatDate, round1, scoreTone } from '../lib/format';
import { loadHistory } from '../lib/storage';

export function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    phase,
    totals,
    items,
    summary,
    error,
    config,
    simulated,
    finishInterview,
    retrySummary,
    restartInterview,
  } = useInterview();
  const [historyBest, setHistoryBest] = useState<number | null>(null);
  const [restarting, setRestarting] = useState(false);

  const reviewingHistory = Boolean((location.state as { fromHistory?: boolean } | null)?.fromHistory);

  useEffect(() => {
    if (phase === 'idle') navigate('/setup', { replace: true });
    // An interview with graded answers but no report yet belongs back on the
    // interview page, where it can be finished or resumed.
    if (phase === 'answering' || phase === 'feedback' || phase === 'evaluating') {
      navigate('/interview', { replace: true });
    }
  }, [phase, navigate]);

  useEffect(() => {
    if (phase === 'scoring' && items.length > 0) void finishInterview();
    // Only kick off once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (reviewingHistory) return;
    const others = loadHistory().filter((record) => record.completedAt && record.items.length > 0);
    const best = others.length ? Math.max(...others.map((record) => record.percentage)) : null;
    setHistoryBest(best);
  }, [reviewingHistory, phase]);

  const dimensionAverages = useMemo(() => {
    if (items.length === 0) return [];
    const keys = Object.keys(DIMENSION_LABELS) as Array<keyof typeof DIMENSION_LABELS>;
    return keys.map((key) => {
      const values = items.map((item) => item.scores[key as keyof typeof item.scores] ?? 0);
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      return { key, label: DIMENSION_LABELS[key] ?? key, average: round1(average) };
    });
  }, [items]);

  const strongestDimension = dimensionAverages.length
    ? dimensionAverages.reduce((best, current) => (current.average > best.average ? current : best))
    : null;
  const weakestDimension = dimensionAverages.length
    ? dimensionAverages.reduce((worst, current) => (current.average < worst.average ? current : worst))
    : null;

  if (phase === 'scoring' && !summary) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        {error ? (
          <div className="space-y-4">
            <ErrorAlert
              title="Could not generate your report"
              message={error}
              onRetry={() => void retrySummary()}
            />
            <p className="text-center text-xs text-slate-500">
              Your per-question scores are saved. You can also retry later from History.
            </p>
            <div className="flex justify-center">
              <LinkButton to="/history" variant="secondary">
                Go to history
              </LinkButton>
            </div>
          </div>
        ) : (
          <LoadingBlock
            title="Writing your performance report…"
            steps={[
              'Reviewing all five answers',
              'Finding your strongest areas',
              'Building a plan for next time',
            ]}
          />
        )}
      </div>
    );
  }

  if (phase !== 'complete' && !summary) return null;

  const tone = scoreTone(totals.percentage);
  const isSimulated = simulated || summary?.simulated;
  const bestItems = [...items].sort((a, b) => b.score - a.score).slice(0, 2);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="animate-fade-up text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
          <Trophy className="size-3.5" aria-hidden />
          Interview complete
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Your performance report
        </h1>
        {config ? (
          <p className="mt-2 text-sm text-slate-600">
            {config.role} · {config.experience} · {config.difficulty}
          </p>
        ) : null}
        {isSimulated ? (
          <div className="mt-3 flex justify-center">
            <SimulatedBadge />
          </div>
        ) : null}
      </header>

      {/* Score card */}
      <section className="card animate-fade-up mt-8 overflow-hidden">
        <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
          <div className="flex justify-center">
            <RadialScore
              score={totals.score}
              max={MAX_TOTAL_SCORE}
              size={168}
              tone={
                totals.percentage >= 80
                  ? '#059669'
                  : totals.percentage >= 60
                    ? '#4f46e5'
                    : totals.percentage >= 40
                      ? '#d97706'
                      : '#e11d48'
              }
            />
          </div>
          <div className="text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}>
                {tone.label}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {totals.percentage}%
              </span>
              {historyBest !== null ? (
                <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                  <TrendingUp className="size-3" aria-hidden />
                  Personal best {historyBest}%
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">
              {totals.score} <span className="text-base font-medium text-slate-500">/ {MAX_TOTAL_SCORE} points</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {items.length} of 5 questions graded · {summary ? formatDate(new Date().toISOString()) : ''}
            </p>
            <div className="mt-4">
              <ProgressBar value={totals.percentage} tone={totals.percentage >= 60 ? 'brand' : 'amber'} />
            </div>
          </div>
        </div>
      </section>

      {/* Overall summary */}
      {summary ? (
        <section className="card animate-fade-up mt-5 p-6 [animation-delay:60ms] sm:p-7">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="size-4 text-brand-600" aria-hidden />
            Overall performance summary
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {summary.overall}
          </p>
        </section>
      ) : null}

      {/* Strengths / improvements / suggestions */}
      {summary ? (
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <section className="card animate-fade-up p-5 [animation-delay:100ms]">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="size-4" aria-hidden />
              Strongest areas
            </h2>
            <ul className="mt-3 space-y-2">
              {summary.strongestAreas.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="card animate-fade-up p-5 [animation-delay:140ms]">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-rose-700">
              <TrendingUp className="size-4" aria-hidden />
              Areas needing improvement
            </h2>
            <ul className="mt-3 space-y-2">
              {summary.improvementAreas.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="card animate-fade-up p-5 [animation-delay:180ms]">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-700">
              <Lightbulb className="size-4" aria-hidden />
              For future interviews
            </h2>
            <ul className="mt-3 space-y-2">
              {summary.futureSuggestions.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {/* Skill dimensions */}
      {dimensionAverages.length > 0 ? (
        <section className="card animate-fade-up mt-5 p-6 [animation-delay:200ms]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <BookOpenCheck className="size-4 text-brand-600" aria-hidden />
              Score by dimension
            </h2>
            {strongestDimension && weakestDimension ? (
              <p className="text-xs text-slate-500">
                Strongest: <span className="font-semibold text-emerald-700">{strongestDimension.label}</span>{' '}
                · Weakest: <span className="font-semibold text-rose-700">{weakestDimension.label}</span>
              </p>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {dimensionAverages.map((dimension) => {
              const dimensionTone = scoreTone(dimension.average * 10);
              return (
                <div key={dimension.key}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-xs font-medium text-slate-600">{dimension.label}</span>
                    <span className={`text-xs font-bold ${dimensionTone.text}`}>{dimension.average}/10</span>
                  </div>
                  <ProgressBar
                    value={dimension.average}
                    max={10}
                    height="sm"
                    tone={dimension.average >= 7 ? 'emerald' : dimension.average >= 5 ? 'brand' : 'amber'}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Per question */}
      <section className="mt-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ClipboardList className="size-4 text-brand-600" aria-hidden />
          Your answers
        </h2>
        <ul className="space-y-2.5">
          {items.map((item, index) => {
            const itemTone = scoreTone(item.score * 10);
            return (
              <li key={item.questionId} className="card animate-fade-up flex items-start gap-3 p-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-slate-800">{item.question}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                    {item.type === 'hr' ? 'HR' : 'Technical'} · {item.timeSpentSeconds}s
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${itemTone.bg} ${itemTone.text} ${itemTone.ring}`}>
                  {round1(item.score)}/10
                </span>
              </li>
            );
          })}
        </ul>
        {items.length < 5 ? (
          <p className="mt-2 text-xs text-slate-500">
            {5 - items.length} question{5 - items.length === 1 ? '' : 's'} were not answered (scored 0
            in the total).
          </p>
        ) : null}
        {bestItems.length > 0 ? (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-600">
            <Trophy className="mt-0.5 size-3.5 shrink-0 text-amber-500" aria-hidden />
            Best answer: question {items.indexOf(bestItems[0]!) + 1} at {round1(bestItems[0]!.score)}/10.
          </p>
        ) : null}
      </section>

      {/* Actions */}
      <div className="animate-fade-up mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        <Button
          size="lg"
          loading={restarting}
          loadingText="Preparing questions…"
          onClick={async () => {
            if (!config) {
              navigate('/setup');
              return;
            }
            setRestarting(true);
            await restartInterview(config);
            setRestarting(false);
            navigate('/interview');
          }}
          icon={<RotateCcw className="size-4" aria-hidden />}
        >
          Restart Interview
        </Button>
        <LinkButton to="/history" variant="secondary" size="lg" icon={<ClipboardList className="size-4" aria-hidden />}>
          Review history
        </LinkButton>
        <LinkButton to="/" variant="ghost" size="lg" icon={<Home className="size-4" aria-hidden />}>
          Home
        </LinkButton>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        Restart Interview generates a fresh question set for the same role and never repeats
        questions you have already seen. <ArrowRight className="inline size-3" aria-hidden />
      </p>
    </div>
  );
}
