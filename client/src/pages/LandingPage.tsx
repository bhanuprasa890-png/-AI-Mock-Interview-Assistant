import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Gauge,
  History,
  MessageSquare,
  PlayCircle,
  Sparkles,
  Timer,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { JOB_ROLES, TOTAL_QUESTIONS } from '@shared/types';
import { useInterview } from '../context/InterviewContext';
import { loadHistory } from '../lib/storage';
import { LinkButton, buttonClasses } from '../components/ui/Button';
import { SectionTitle } from '../components/layout/SectionTitle';

const features = [
  {
    icon: BrainCircuit,
    title: 'AI-generated questions',
    description:
      'Every session is built for your exact role, experience level and difficulty - 3 technical questions and 2 HR questions, generated fresh by Gemini.',
    accent: 'from-brand-500 to-brand-600',
  },
  {
    icon: Zap,
    title: 'Instant AI feedback',
    description:
      'Each answer is scored out of 10 across five dimensions, with what worked, what was missing and a model answer you can learn from.',
    accent: 'from-violet-brand-500 to-brand-500',
  },
  {
    icon: BarChart3,
    title: 'Performance tracking',
    description:
      'Finished interviews are saved on your device, so you can watch your scores climb and revisit every answer you gave.',
    accent: 'from-brand-600 to-violet-brand-600',
  },
];

const steps = [
  {
    icon: ClipboardList,
    title: 'Choose your setup',
    description: 'Pick a role, experience level and difficulty.',
  },
  {
    icon: Timer,
    title: `Answer ${TOTAL_QUESTIONS} questions`,
    description: 'Two minutes per question, one question at a time.',
  },
  {
    icon: MessageSquare,
    title: 'Read your feedback',
    description: 'Scores, gaps and a stronger sample answer.',
  },
  {
    icon: Gauge,
    title: 'Review the report',
    description: 'A total out of 50 plus a plan for next time.',
  },
];

export function LandingPage() {
  const { hasActive } = useInterview();
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    setCompletedCount(loadHistory().filter((record) => record.status === 'completed').length);
  }, []);

  return (
    <div>
      {/* ------------------------------- Hero ------------------------------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 size-[26rem] rounded-full bg-gradient-to-br from-brand-200/50 to-violet-brand-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-float-slow pointer-events-none absolute -left-24 top-32 size-72 rounded-full bg-brand-100/40 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:pb-24 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
                <Sparkles className="size-3.5" aria-hidden />
                Powered by Google Gemini
              </span>

              <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Practice Smarter.
                <br />
                <span className="gradient-text">Interview Better.</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                InterviewMate AI runs realistic mock interviews for the job you are targeting. Answer
                five role-specific questions and get honest, structured AI feedback on how you did -
                so the real interview is never the first time you say it out loud.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <LinkButton to="/setup" size="lg" icon={<PlayCircle className="size-5" aria-hidden />}>
                  Start Interview
                </LinkButton>
                {hasActive ? (
                  <Link to="/interview" className={buttonClasses('secondary', 'lg')}>
                    Resume interview
                    <History className="size-4" aria-hidden />
                  </Link>
                ) : (
                  <Link to="/history" className={buttonClasses('secondary', 'lg')}>
                    View history
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                )}
              </div>

              <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
                  <span>
                    <strong className="font-semibold text-slate-900">7 job roles</strong> covered
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
                  <span>
                    <strong className="font-semibold text-slate-900">5 questions</strong> per interview
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
                  <span>
                    <strong className="font-semibold text-slate-900">
                      {completedCount > 0 ? completedCount : 'No'} interview
                      {completedCount === 1 ? '' : 's'}
                    </strong>{' '}
                    saved on this device
                  </span>
                </div>
              </dl>
            </div>

            {/* Mock preview card */}
            <div className="animate-fade-up [animation-delay:120ms]">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div
                  aria-hidden
                  className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-brand-200/50 via-violet-brand-200/40 to-transparent blur-xl"
                />
                <div className="relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-brand-600/10">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50">
                        <BrainCircuit className="size-4 text-brand-600" aria-hidden />
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-900">Python Developer</p>
                        <p className="text-[11px] text-slate-500">Fresher · Medium</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                      <Clock3 className="size-3" aria-hidden />
                      1:42
                    </span>
                  </div>

                  <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-brand-600">
                    Question 2 of 5
                  </p>
                  <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800">
                    How does Python manage memory, and what role does the GIL play when you write
                    concurrent code?
                  </p>

                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-brand-500 to-violet-brand-500" />
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700">Latest score</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                        8.0 / 10
                      </span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {[
                        { label: 'Clarity', value: '92%' },
                        { label: 'Completeness', value: '74%' },
                        { label: 'Technical', value: '86%' },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center gap-2">
                          <span className="w-24 shrink-0 text-[10px] text-slate-500">{row.label}</span>
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-violet-brand-400"
                              style={{ width: row.value }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden />
                    <p className="text-[11px] leading-snug text-emerald-900">
                      Clear explanation of reference counting - add one concrete example to reach a 9.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ Features ---------------------------- */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16" aria-labelledby="features-heading">
        <SectionTitle
          eyebrow="Why InterviewMate"
          title={<span id="features-heading">Built around how interviews actually feel</span>}
          description="Not a quiz app and not a static script. Every question and every piece of feedback comes from a live AI model, scoped to the role you are preparing for."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="card card-hover animate-fade-up p-6"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <span
                className={`inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.accent} shadow-sm`}
              >
                <feature.icon className="size-5 text-white" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* -------------------------------- Steps ----------------------------- */}
      <section className="border-y border-slate-200/70 bg-white/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <SectionTitle
            eyebrow="How it works"
            title="Four steps, about fifteen minutes"
            description="A full interview takes roughly 10-15 minutes including feedback reading - short enough to do before a real one."
          />
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="card animate-fade-up relative p-5"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <span className="absolute right-4 top-4 text-2xl font-extrabold text-slate-100">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <step.icon className="size-5 text-brand-600" aria-hidden />
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{step.description}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-center text-xs text-slate-500">
            Roles available: {JOB_ROLES.join(' · ')}
          </p>
        </div>
      </section>

      {/* -------------------------------- CTA ------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-600 to-violet-brand-600 px-6 py-10 text-center shadow-xl shadow-brand-600/20 sm:px-12 sm:py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-white/10 blur-2xl"
          />
          <h2 className="relative text-2xl font-bold text-white sm:text-3xl">
            Your next interview starts here
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-50 sm:text-base">
            Pick a role and difficulty, and InterviewMate AI will have your first question ready in
            seconds.
          </p>
          <div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/setup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-brand-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Start Interview
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              to="/history"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <History className="size-4" aria-hidden />
              Previous results
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
