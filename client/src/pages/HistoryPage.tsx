import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  ClipboardList,
  History as HistoryIcon,
  Sparkles,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { InterviewRecord } from '@shared/types';
import { Button, LinkButton } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/Loading';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useInterview } from '../context/InterviewContext';
import { formatDate, formatRelative, round1, scoreTone } from '../lib/format';
import { clearHistory, deleteRecord, loadHistory } from '../lib/storage';

const filters = ['all', 'completed', 'in_progress'] as const;
type Filter = (typeof filters)[number];

export function HistoryPage() {
  const navigate = useNavigate();
  const { resumeInterview } = useInterview();
  const [records, setRecords] = useState<InterviewRecord[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [pendingDelete, setPendingDelete] = useState<InterviewRecord | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = useCallback(() => setRecords(loadHistory()), []);
  useEffect(() => refresh(), [refresh]);

  const stats = useMemo(() => {
    const completed = records.filter((record) => record.status === 'completed' && record.items.length > 0);
    const average = completed.length
      ? round1(completed.reduce((sum, record) => sum + record.percentage, 0) / completed.length)
      : 0;
    const best = completed.length ? Math.max(...completed.map((record) => record.percentage)) : 0;
    const recent = completed.slice(0, 5).map((record) => record.percentage).reverse();
    const trend = recent.length >= 2 ? round1(recent[recent.length - 1]! - recent[0]!) : 0;
    return { completed: completed.length, average, best, trend, sparkline: recent };
  }, [records]);

  const visible = records.filter((record) => (filter === 'all' ? true : record.status === filter));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Your progress</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Interview history</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            Every interview you finish is stored on this device only. Open any past result to re-read
            the AI feedback, question by question.
          </p>
        </div>
        <LinkButton to="/setup" icon={<Sparkles className="size-4" aria-hidden />}>
          New interview
        </LinkButton>
      </header>

      {/* Performance summary */}
      {stats.completed > 0 ? (
        <section className="card animate-fade-up mt-6 p-5 [animation-delay:60ms]">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BarChart3 className="size-4 text-brand-600" aria-hidden />
            Performance summary
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.completed}</p>
              <p className="text-xs text-slate-500">Interviews completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.average}%</p>
              <p className="text-xs text-slate-500">Average score</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.best}%</p>
              <p className="text-xs text-slate-500">Personal best</p>
            </div>
            <div>
              <p
                className={`flex items-center gap-1 text-2xl font-bold ${
                  stats.trend > 0 ? 'text-emerald-600' : stats.trend < 0 ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {stats.trend > 0 ? '+' : ''}
                {stats.trend}
                {stats.trend > 0 ? <TrendingUp className="size-4" aria-hidden /> : null}
              </p>
              <p className="text-xs text-slate-500">Trend vs 5 ago</p>
            </div>
          </div>

          {stats.sparkline.length >= 2 ? (
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Last {stats.sparkline.length} interviews
              </p>
              <div className="flex items-end gap-1.5" aria-hidden>
                {stats.sparkline.map((value, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t bg-gradient-to-t from-brand-500 to-violet-brand-400"
                    style={{ height: `${Math.max(6, (value / 100) * 56)}px` }}
                    title={`${value}%`}
                  />
                ))}
              </div>
              <p className="sr-only">
                Scores, oldest to newest: {stats.sparkline.join('%, ')}%
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Filters */}
      {records.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" role="tablist" aria-label="Filter interviews">
            {filters.map((value) => (
              <button
                key={value}
                role="tab"
                aria-selected={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  filter === value ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {value === 'in_progress' ? 'In progress' : value}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-rose-600"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Clear all history
          </button>
        </div>
      ) : null}

      {/* List */}
      <div className="mt-4 space-y-3">
        {visible.length === 0 ? (
          <div className="animate-fade-up">
            <EmptyState
              icon={<HistoryIcon className="size-6" aria-hidden />}
              title={records.length === 0 ? 'No interviews yet' : 'Nothing in this filter'}
              description={
                records.length === 0
                  ? 'Finish your first mock interview and it will appear here with a full score breakdown.'
                  : 'Try a different filter to see your interviews.'
              }
              action={
                records.length === 0 ? (
                  <LinkButton to="/setup" icon={<ArrowRight className="size-4" aria-hidden />}>
                    Start your first interview
                  </LinkButton>
                ) : null
              }
            />
          </div>
        ) : (
          visible.map((record, index) => {
            const tone = scoreTone(record.percentage);
            const inProgress = record.status === 'in_progress';
            return (
              <article
                key={record.id}
                className="card card-hover animate-fade-up p-4 sm:p-5"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-slate-900">{record.config.role}</h2>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {record.config.experience}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {record.config.difficulty}
                      </span>
                      {inProgress ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                          In progress
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="size-3" aria-hidden />
                        {formatDate(record.createdAt)} · {formatRelative(record.createdAt)}
                      </span>
                      <span>
                        {record.items.length}/{record.questions.length || 5} answered
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    {inProgress ? (
                      <p className="text-xs font-semibold text-amber-700">Not finished</p>
                    ) : (
                      <>
                        <p className={`text-lg font-bold ${tone.text}`}>{record.percentage}%</p>
                        <p className="text-[11px] text-slate-500">
                          {record.score} / {record.maxScore}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <ProgressBar
                    value={inProgress ? (record.items.length / Math.max(1, record.questions.length)) * 100 : record.percentage}
                    tone={inProgress ? 'amber' : record.percentage >= 60 ? 'brand' : 'rose'}
                    height="sm"
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {inProgress ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        resumeInterview();
                        navigate('/interview');
                      }}
                      icon={<ArrowRight className="size-3.5" aria-hidden />}
                    >
                      Resume
                    </Button>
                  ) : (
                    <Link
                      to={`/history/${record.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                    >
                      <ClipboardList className="size-3.5" aria-hidden />
                      Review result
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => setPendingDelete(record)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    Delete
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this interview?"
        description="This removes the saved result and its feedback from this device. It cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteRecord(pendingDelete.id);
          setPendingDelete(null);
          refresh();
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Clear all interview history?"
        description="Every saved interview and score on this device will be deleted. This cannot be undone."
        confirmLabel="Clear everything"
        destructive
        onConfirm={() => {
          clearHistory();
          setConfirmClear(false);
          refresh();
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
