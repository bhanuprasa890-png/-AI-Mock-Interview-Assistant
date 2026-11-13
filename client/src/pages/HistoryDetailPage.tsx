import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Trophy,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MAX_TOTAL_SCORE,
  type Evaluation,
  type InterviewRecord,
  type InterviewRecordItem,
} from '@shared/types';
import { EvaluationView } from '../components/feedback/EvaluationView';
import { LinkButton } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Loading';
import { ProgressBar, RadialScore } from '../components/ui/ProgressBar';
import { DIMENSION_LABELS, formatDate, round1, scoreTone } from '../lib/format';
import { getRecord } from '../lib/storage';

function toEvaluation(item: InterviewRecordItem): Evaluation {
  return {
    score: item.score,
    scores: item.scores,
    good: item.good,
    missing: item.missing,
    suggestions: item.suggestions,
    improvedAnswer: item.improvedAnswer,
    simulated: Boolean(item.simulated),
  };
}

export function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<InterviewRecord | null | undefined>(undefined);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setRecord(null);
      return;
    }
    setRecord(getRecord(id) ?? null);
  }, [id]);

  const dimensionAverages = useMemo(() => {
    if (!record || record.items.length === 0) return [];
    return (Object.keys(DIMENSION_LABELS) as Array<keyof InterviewRecordItem['scores']>).map((key) => {
      const values = record.items.map((item) => item.scores[key] ?? 0);
      return {
        key,
        label: DIMENSION_LABELS[key] ?? key,
        average: round1(values.reduce((sum, value) => sum + value, 0) / values.length),
      };
    });
  }, [record]);

  if (record === undefined) return null;

  if (record === null) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          icon={<ClipboardList className="size-6" aria-hidden />}
          title="Interview not found"
          description="This result is not stored on this device. It may have been deleted or saved in another browser."
          action={
            <LinkButton to="/history" icon={<ArrowLeft className="size-4" aria-hidden />}>
              Back to history
            </LinkButton>
          }
        />
      </div>
    );
  }

  const tone = scoreTone(record.percentage);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        to="/history"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-brand-700"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to history
      </Link>

      <header className="animate-fade-up mt-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Saved result</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {record.config.role} interview
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          {record.config.experience} · {record.config.difficulty} · {formatDate(record.createdAt)}
        </p>
      </header>

      <section className="card animate-fade-up mt-6 p-6">
        <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex justify-center">
            <RadialScore score={record.score} max={MAX_TOTAL_SCORE} size={148} />
          </div>
          <div className="text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}>
                {tone.label}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {record.percentage}%
              </span>
              <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                <Trophy className="size-3" aria-hidden />
                {record.items.length} questions graded
              </span>
            </div>
            <div className="mt-4">
              <ProgressBar value={record.percentage} tone={record.percentage >= 60 ? 'brand' : 'amber'} />
            </div>
            {record.summary ? (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {record.summary.overall}
              </p>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                No closing summary was generated for this interview, but every answer was graded and
                is listed below.
              </p>
            )}
          </div>
        </div>
      </section>

      {record.summary ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            { title: 'Strongest areas', items: record.summary.strongestAreas, color: 'emerald' },
            { title: 'Needs improvement', items: record.summary.improvementAreas, color: 'rose' },
            { title: 'Future suggestions', items: record.summary.futureSuggestions, color: 'amber' },
          ].map((block) => (
            <section key={block.title} className="card p-5">
              <h2 className="text-sm font-semibold text-slate-900">{block.title}</h2>
              <ul className="mt-3 space-y-2">
                {block.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                    <span
                      className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                        block.color === 'emerald'
                          ? 'bg-emerald-500'
                          : block.color === 'rose'
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                      }`}
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}

      {dimensionAverages.length > 0 ? (
        <section className="card mt-5 p-6">
          <h2 className="text-sm font-semibold text-slate-900">Score by dimension</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {dimensionAverages.map((dimension) => (
              <div key={dimension.key}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-xs font-medium text-slate-600">{dimension.label}</span>
                  <span className="text-xs font-bold text-slate-700">{dimension.average}/10</span>
                </div>
                <ProgressBar
                  value={dimension.average}
                  max={10}
                  height="sm"
                  tone={dimension.average >= 7 ? 'emerald' : dimension.average >= 5 ? 'brand' : 'amber'}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ClipboardList className="size-4 text-brand-600" aria-hidden />
          Questions and feedback
        </h2>

        {record.items.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-6" aria-hidden />}
            title="No answers were graded"
            description="This interview was saved before any answer was submitted."
          />
        ) : (
          <div className="space-y-3">
            {record.items.map((item, index) => {
              const itemTone = scoreTone(item.score * 10);
              const open = openId === item.questionId;
              return (
                <article key={item.questionId} className="card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : item.questionId)}
                    aria-expanded={open}
                    className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-slate-50/70"
                  >
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
                  </button>

                  {open ? (
                    <div className="animate-fade-in border-t border-slate-100 p-4 sm:p-5">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Your answer
                        </h3>
                        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                          {item.answer || 'No answer saved.'}
                        </p>
                      </div>
                      <div className="mt-5">
                        <EvaluationView evaluation={toEvaluation(item)} questionType={item.type} />
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
          <CheckCircle2 className="size-3.5 text-emerald-500" aria-hidden />
          Select any question to see the full feedback and model answer.
        </p>
      </section>
    </div>
  );
}
