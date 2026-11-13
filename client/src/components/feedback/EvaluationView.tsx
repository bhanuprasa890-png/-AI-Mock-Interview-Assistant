import { CheckCircle2, CircleSlash, Lightbulb, MessageSquareQuote, Target } from 'lucide-react';
import type { Evaluation } from '@shared/types';
import { DIMENSION_LABELS, round1, scoreTone } from '../../lib/format';
import { RadialScore } from '../ui/ProgressBar';

function BulletList({
  items,
  icon,
  tone,
}: {
  items: string[];
  icon: React.ReactNode;
  tone: 'emerald' | 'rose' | 'amber';
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    rose: 'bg-rose-50 text-rose-600 ring-rose-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  } as const;

  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700">
          <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ${tones[tone]}`}>
            {icon}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ScoreBreakdown({ scores }: { scores: Evaluation['scores'] }) {
  const entries = Object.entries(scores) as Array<[keyof typeof scores, number]>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entries.map(([key, value]) => {
        const tone = scoreTone(value * 10);
        return (
          <div key={key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-600">{DIMENSION_LABELS[key] ?? key}</span>
              <span className={`text-xs font-bold ${tone.text}`}>{round1(value)}/10</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ease-out ${tone.bar}`}
                style={{ width: `${Math.min(100, value * 10)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Reusable evaluation card, used on the feedback page and in history review. */
export function EvaluationView({
  evaluation,
  questionType,
}: {
  evaluation: Evaluation;
  questionType?: 'technical' | 'hr';
}) {
  const tone = scoreTone(evaluation.score * 10);

  return (
    <div className="space-y-5">
      <div className="card animate-fade-up flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-center sm:gap-7">
        <RadialScore
          score={evaluation.score}
          max={10}
          size={132}
          tone={evaluation.score >= 8 ? '#059669' : evaluation.score >= 6 ? '#4f46e5' : evaluation.score >= 4 ? '#d97706' : '#e11d48'}
        />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}>
              {tone.label}
            </span>
            {questionType ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
                {questionType === 'hr' ? 'HR question' : 'Technical question'}
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-lg font-semibold text-slate-900">AI feedback on your answer</h2>
          <p className="mt-1 text-sm text-slate-600">
            Graded on technical correctness, relevance, clarity, completeness and communication.
          </p>
        </div>
      </div>

      <div className="card animate-fade-up p-6 [animation-delay:60ms]">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Target className="size-4 text-brand-600" aria-hidden />
          Score breakdown
        </h3>
        <div className="mt-4">
          <ScoreBreakdown scores={evaluation.scores} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card animate-fade-up p-6 [animation-delay:100ms]">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="size-4" aria-hidden />
            What was good
          </h3>
          <div className="mt-4">
            <BulletList items={evaluation.good} icon={<CheckCircle2 className="size-3" aria-hidden />} tone="emerald" />
          </div>
        </div>

        <div className="card animate-fade-up p-6 [animation-delay:140ms]">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-rose-700">
            <CircleSlash className="size-4" aria-hidden />
            What was missing
          </h3>
          <div className="mt-4">
            <BulletList items={evaluation.missing} icon={<CircleSlash className="size-3" aria-hidden />} tone="rose" />
          </div>
        </div>
      </div>

      <div className="card animate-fade-up p-6 [animation-delay:180ms]">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700">
          <Lightbulb className="size-4" aria-hidden />
          Suggestions for improvement
        </h3>
        <div className="mt-4">
          <BulletList items={evaluation.suggestions} icon={<Lightbulb className="size-3" aria-hidden />} tone="amber" />
        </div>
      </div>

      <div className="animate-fade-up rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 to-violet-brand-50/80 p-6 [animation-delay:220ms]">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-800">
          <MessageSquareQuote className="size-4" aria-hidden />
          A stronger answer
        </h3>
        <blockquote className="mt-3 whitespace-pre-line border-l-2 border-brand-300 pl-4 text-sm leading-relaxed text-slate-700">
          {evaluation.improvedAnswer}
        </blockquote>
      </div>
    </div>
  );
}
