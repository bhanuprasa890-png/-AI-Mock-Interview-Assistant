import { ArrowRight, BadgeCheck, Brain, Check, Gauge, GraduationCap, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DIFFICULTIES,
  EXPERIENCE_LEVELS,
  HR_QUESTIONS,
  JOB_ROLES,
  SECONDS_PER_QUESTION,
  TECHNICAL_QUESTIONS,
  type Difficulty,
  type ExperienceLevel,
  type InterviewConfig,
  type JobRole,
} from '@shared/types';
import { useInterview, readActiveOrNull } from '../context/InterviewContext';
import { loadLastConfig } from '../lib/storage';
import { Button } from '../components/ui/Button';
import { ErrorAlert } from '../components/ui/Feedback';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingBlock } from '../components/ui/Loading';

const ROLE_HINTS: Record<JobRole, string> = {
  'Python Developer': 'Core Python, OOP, testing, concurrency',
  'Web Developer': 'HTML, CSS, JavaScript, HTTP, accessibility',
  'Data Analyst': 'SQL, pandas, statistics, visualisation',
  'Java Developer': 'OOP, collections, JVM, Spring basics',
  'AI/ML Engineer': 'Modeling, evaluation, features, deployment',
  'Frontend Developer': 'React, TypeScript, state, performance',
  'Backend Developer': 'APIs, databases, auth, reliability',
};

const DIFFICULTY_HINTS: Record<Difficulty, string> = {
  Easy: 'Definitions and fundamentals',
  Medium: 'Applied scenarios with reasoning',
  Hard: 'Depth, trade-offs and production design',
};

const EXPERIENCE_HINTS: Record<ExperienceLevel, string> = {
  Fresher: 'Projects, coursework and internships',
  Experienced: 'Production work, ownership and mentoring',
};

const defaultConfig: InterviewConfig = {
  role: 'Python Developer',
  experience: 'Fresher',
  difficulty: 'Medium',
};

function OptionCard({
  selected,
  onSelect,
  title,
  description,
  icon,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative w-full rounded-xl border p-3.5 text-left transition duration-200 ${
        selected
          ? 'border-brand-500 bg-brand-50/70 shadow-sm shadow-brand-600/10 ring-1 ring-brand-500'
          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {icon ? (
          <span
            className={`mt-0.5 shrink-0 transition ${selected ? 'text-brand-600' : 'text-slate-400 group-hover:text-brand-500'}`}
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${selected ? 'text-brand-800' : 'text-slate-800'}`}>
            {title}
          </p>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{description}</p>
          ) : null}
        </div>
        {selected ? (
          <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-600">
            <Check className="size-3 text-white" aria-hidden strokeWidth={3} />
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function SetupPage() {
  const navigate = useNavigate();
  const { phase, error, clearError, startInterview, hasActive, resumeInterview, discardActive } =
    useInterview();
  const [config, setConfig] = useState<InterviewConfig>(defaultConfig);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [startedOnce, setStartedOnce] = useState(false);

  useEffect(() => {
    const last = loadLastConfig();
    if (last && JOB_ROLES.includes(last.role)) setConfig(last);
  }, []);

  const loading = phase === 'loading-questions';

  const handleStart = async () => {
    // Confirm before abandoning an unfinished interview.
    if (readActiveOrNull() && hasActive) {
      setShowRestartConfirm(true);
      return;
    }
    await begin();
  };

  const begin = async () => {
    setShowRestartConfirm(false);
    setStartedOnce(true);
    await startInterview(config);
  };

  // Navigate only after questions actually arrived.
  useEffect(() => {
    if (startedOnce && phase === 'answering') {
      setStartedOnce(false);
      navigate('/interview');
    }
  }, [phase, startedOnce, navigate]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="animate-fade-up mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
          <Sparkles className="size-3.5" aria-hidden />
          Step 1 of 4 · Interview setup
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Set up your mock interview
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
          Pick a role, your experience level and how tough you want it. Gemini will generate{' '}
          {TECHNICAL_QUESTIONS} technical and {HR_QUESTIONS} HR questions for exactly that
          combination.
        </p>
      </header>

      {error ? (
        <div className="mx-auto mt-6 max-w-2xl">
          <ErrorAlert
            title="Could not start the interview"
            message={error}
            onRetry={begin}
            onDismiss={clearError}
          />
        </div>
      ) : null}

      {loading ? (
        <div className="mx-auto mt-8 max-w-xl">
          <LoadingBlock
            title="Generating your questions…"
            steps={[
              'Matching questions to your role and level',
              'Balancing 3 technical and 2 HR questions',
              'Checking you have not seen these before',
            ]}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          <div className="space-y-6">
            {/* Role */}
            <section className="card animate-fade-up p-5 sm:p-6" aria-labelledby="role-heading">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Brain className="size-4" aria-hidden />
                </span>
                <div>
                  <h2 id="role-heading" className="text-sm font-semibold text-slate-900">
                    1. Job role
                  </h2>
                  <p className="text-xs text-slate-500">What are you preparing for?</p>
                </div>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {JOB_ROLES.map((role) => (
                  <OptionCard
                    key={role}
                    title={role}
                    description={ROLE_HINTS[role]}
                    selected={config.role === role}
                    onSelect={() => setConfig((prev) => ({ ...prev, role }))}
                  />
                ))}
              </div>
            </section>

            {/* Experience */}
            <section className="card animate-fade-up p-5 [animation-delay:60ms] sm:p-6" aria-labelledby="experience-heading">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-violet-brand-50 text-violet-brand-600">
                  <GraduationCap className="size-4" aria-hidden />
                </span>
                <div>
                  <h2 id="experience-heading" className="text-sm font-semibold text-slate-900">
                    2. Experience level
                  </h2>
                  <p className="text-xs text-slate-500">This changes what the questions assume.</p>
                </div>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {EXPERIENCE_LEVELS.map((level) => (
                  <OptionCard
                    key={level}
                    title={level}
                    description={EXPERIENCE_HINTS[level]}
                    selected={config.experience === level}
                    onSelect={() => setConfig((prev) => ({ ...prev, experience: level }))}
                  />
                ))}
              </div>
            </section>

            {/* Difficulty */}
            <section className="card animate-fade-up p-5 [animation-delay:120ms] sm:p-6" aria-labelledby="difficulty-heading">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Gauge className="size-4" aria-hidden />
                </span>
                <div>
                  <h2 id="difficulty-heading" className="text-sm font-semibold text-slate-900">
                    3. Interview difficulty
                  </h2>
                  <p className="text-xs text-slate-500">Start easy, then work up to hard.</p>
                </div>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {DIFFICULTIES.map((difficulty) => (
                  <OptionCard
                    key={difficulty}
                    title={difficulty}
                    description={DIFFICULTY_HINTS[difficulty]}
                    selected={config.difficulty === difficulty}
                    onSelect={() => setConfig((prev) => ({ ...prev, difficulty }))}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Summary rail */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card animate-fade-up overflow-hidden [animation-delay:160ms]">
              <div className="gradient-surface px-5 py-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
                  Your interview
                </p>
                <p className="mt-1 text-lg font-bold">{config.role}</p>
                <p className="text-xs text-white/85">
                  {config.experience} · {config.difficulty}
                </p>
              </div>
              <div className="space-y-3 p-5">
                {[
                  { label: 'Questions', value: `${TECHNICAL_QUESTIONS} technical + ${HR_QUESTIONS} HR` },
                  { label: 'Time per question', value: `${SECONDS_PER_QUESTION / 60} minutes` },
                  { label: 'Feedback', value: 'Instant AI review + score' },
                  { label: 'Final report', value: 'Score out of 50 + summary' },
                ].map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-slate-500">{row.label}</span>
                    <span className="text-right font-medium text-slate-800">{row.value}</span>
                  </div>
                ))}

                <Button
                  className="mt-2 w-full"
                  size="lg"
                  onClick={handleStart}
                  loading={loading}
                  loadingText="Starting…"
                  icon={<ArrowRight className="size-4" aria-hidden />}
                >
                  Start Interview
                </Button>

                {hasActive ? (
                  <button
                    type="button"
                    onClick={() => {
                      resumeInterview();
                      navigate('/interview');
                    }}
                    className="w-full text-center text-xs font-medium text-brand-700 underline-offset-2 transition hover:underline"
                  >
                    You have an unfinished interview - resume it instead
                  </button>
                ) : null}

                <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-500">
                  <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" aria-hidden />
                  Questions are generated fresh each time, so you will not repeat the last set.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={showRestartConfirm}
        title="Start a new interview?"
        description="You have an interview in progress. Starting a new one will discard those unanswered questions and your progress so far. Your graded answers stay in History."
        confirmLabel="Discard and start"
        cancelLabel="Keep current interview"
        destructive
        onConfirm={async () => {
          discardActive();
          await begin();
        }}
        onCancel={() => setShowRestartConfirm(false)}
      />
    </div>
  );
}
