import { AlertCircle, ArrowRight, Clock3, Lightbulb, LogOut, Send, TimerOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SECONDS_PER_QUESTION } from '@shared/types';
import { EvaluationView } from '../components/feedback/EvaluationView';
import { Button, LinkButton } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorAlert, SimulatedBadge } from '../components/ui/Feedback';
import { LoadingBlock } from '../components/ui/Loading';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useInterview } from '../context/InterviewContext';
import { formatClock } from '../lib/format';

const MIN_ANSWER_LENGTH = 1;
const LOW_TIME_THRESHOLD = 20;

export function InterviewPage() {
  const navigate = useNavigate();
  const {
    phase,
    questions,
    currentQuestion,
    currentIndex,
    items,
    latest,
    progress,
    config,
    simulated,
    error,
    clearError,
    submitAnswer,
    nextQuestion,
    finishInterview,
  } = useInterview();

  const [answer, setAnswer] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_QUESTION);
  const [expired, setExpired] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const startRef = useRef<number>(Date.now());
  const submittedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const answeredIds = useMemo(() => new Set(items.map((item) => item.questionId)), [items]);
  const alreadyAnswered = currentQuestion ? answeredIds.has(currentQuestion.id) : false;

  // Reset per-question local state whenever the question changes.
  useEffect(() => {
    setAnswer('');
    setExpired(false);
    setSecondsLeft(SECONDS_PER_QUESTION);
    setValidationError(null);
    submittedRef.current = false;
    startRef.current = Date.now();

    if (phase === 'answering') {
      // Move focus to the question for keyboard and screen-reader users.
      headingRef.current?.focus();
      const timer = setTimeout(() => textareaRef.current?.focus(), 400);
      return () => clearTimeout(timer);
    }
    return undefined;
    // Intentionally keyed on the question identity only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id]);

  const doSubmit = useCallback(
    async (text: string) => {
      if (submittedRef.current) return;
      if (text.trim().length < MIN_ANSWER_LENGTH) {
        setValidationError('Please write an answer before submitting.');
        textareaRef.current?.focus();
        return;
      }
      submittedRef.current = true;
      setValidationError(null);
      const graded = await submitAnswer(text, (Date.now() - startRef.current) / 1000);
      // A failed grading must not lock the question - let the user retry.
      if (!graded) submittedRef.current = false;
    },
    [submitAnswer],
  );

  // Countdown timer for the current question.
  useEffect(() => {
    if (phase !== 'answering' || expired) return undefined;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, expired]);

  // When time runs out with text typed, submit it for grading automatically so
  // the candidate is not blocked mid-interview. Empty answers cannot submit.
  useEffect(() => {
    if (!expired || phase !== 'answering') return;
    if (answer.trim().length > 0 && !submittedRef.current) {
      void doSubmit(answer);
    }
  }, [expired, phase, answer, doSubmit]);

  // Route to results as soon as the summary request starts.
  useEffect(() => {
    if (phase === 'scoring' || phase === 'complete') navigate('/results');
  }, [phase, navigate]);

  // Warn on refresh / tab close while the interview is unfinished.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (phase === 'answering' || phase === 'evaluating' || phase === 'feedback') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [phase]);

  if (phase === 'loading-questions') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <LoadingBlock title="Preparing your interview…" steps={['Loading your question set']} />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="card p-8">
          <h1 className="text-lg font-semibold text-slate-900">No interview in progress</h1>
          <p className="mt-2 text-sm text-slate-600">
            Set up a role and difficulty to generate your first question.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <LinkButton to="/setup" icon={<ArrowRight className="size-4" aria-hidden />}>
              Start an interview
            </LinkButton>
            <LinkButton to="/history" variant="secondary">
              View history
            </LinkButton>
          </div>
        </div>
      </div>
    );
  }

  const isEvaluating = phase === 'evaluating';
  const showFeedback = phase === 'feedback' && latest;
  const isLastQuestion = currentIndex === questions.length - 1;
  const isLowTime = secondsLeft <= LOW_TIME_THRESHOLD;
  const timerPercent = (secondsLeft / SECONDS_PER_QUESTION) * 100;

  const handleNext = () => {
    if (isLastQuestion) {
      void finishInterview();
      navigate('/results');
      return;
    }
    nextQuestion();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Header: progress + timer */}
      <div className="animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              {config ? `${config.role} · ${config.experience} · ${config.difficulty}` : 'Interview'}
            </p>
            <h1 className="mt-0.5 text-lg font-bold text-slate-900 sm:text-xl">
              Question {progress.current} of {progress.total}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {simulated ? <SimulatedBadge /> : null}
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums ring-1 transition ${
                showFeedback
                  ? 'bg-slate-100 text-slate-500 ring-slate-200'
                  : isLowTime
                    ? 'animate-pulse bg-rose-50 text-rose-700 ring-rose-200'
                    : 'bg-white text-slate-700 ring-slate-200'
              }`}
              role="timer"
              aria-live={isLowTime ? 'polite' : 'off'}
              aria-label={`Time remaining: ${formatClock(secondsLeft)}`}
            >
              <Clock3 className="size-4" aria-hidden />
              {formatClock(secondsLeft)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExitConfirm(true)}
              aria-label="Leave interview"
              title="Leave interview"
            >
              <LogOut className="size-4" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={progress.current} max={progress.total} label="Interview progress" />
          <span className="shrink-0 text-xs font-medium text-slate-500">
            {Math.round((progress.current / progress.total) * 100)}%
          </span>
        </div>

        {/* Per-question timer bar */}
        <div className="mt-2">
          <ProgressBar
            value={timerPercent}
            tone={showFeedback ? 'brand' : isLowTime ? 'rose' : 'brand'}
            height="sm"
            label="Time remaining for this question"
          />
        </div>
      </div>

      {error ? (
        <div className="mt-5">
          <ErrorAlert
            title="Could not submit your answer"
            message={error}
            onRetry={() => void doSubmit(answer)}
            onDismiss={clearError}
          />
        </div>
      ) : null}

      {expired && !showFeedback && answer.trim().length === 0 ? (
        <div className="animate-fade-in mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <TimerOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Time is up for this question.</p>
            <p className="mt-0.5 text-amber-800">
              Empty answers cannot be submitted or graded. Skip ahead - this question will score 0
              in your final report.
            </p>
          </div>
        </div>
      ) : null}

      {/* Question card */}
      <div className="card animate-fade-up mt-5 p-5 sm:p-7">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              currentQuestion?.type === 'hr'
                ? 'bg-violet-brand-50 text-violet-brand-600'
                : 'bg-brand-50 text-brand-700'
            }`}
          >
            {currentQuestion?.type === 'hr' ? 'HR question' : 'Technical question'}
          </span>
          {alreadyAnswered ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              Answered
            </span>
          ) : null}
        </div>

        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mt-3 text-lg font-semibold leading-relaxed text-slate-900 outline-none sm:text-xl"
        >
          {currentQuestion?.question}
        </h2>

        {!showFeedback ? (
          <div className="mt-5">
            {isEvaluating ? (
              <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-6 text-center">
                <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-white shadow-sm">
                  <span className="size-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">Grading your answer…</p>
                <p className="mt-1 text-xs text-slate-600">
                  Gemini is checking correctness, relevance, clarity, completeness and communication.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void doSubmit(answer);
                }}
              >
                <label htmlFor="answer" className="text-xs font-semibold text-slate-700">
                  Your answer
                </label>
                <textarea
                  id="answer"
                  ref={textareaRef}
                  value={answer}
                  onChange={(event) => {
                    setAnswer(event.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                      event.preventDefault();
                      void doSubmit(answer);
                    }
                  }}
                  rows={9}
                  maxLength={4000}
                  disabled={alreadyAnswered}
                  placeholder="Structure your answer: define the concept, give a concrete example, then state the outcome or trade-off."
                  aria-invalid={Boolean(validationError) || undefined}
                  aria-describedby="answer-help"
                  className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-500"
                />
                <div
                  id="answer-help"
                  className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500"
                >
                  <span>
                    {answer.trim() ? `${answer.trim().split(/\s+/).length} words` : 'Aim for 60-120 words'}
                    {' · '}
                    Ctrl/Cmd + Enter to submit
                  </span>
                  <span className={answer.length > 3600 ? 'font-semibold text-amber-600' : ''}>
                    {answer.length}/4000
                  </span>
                </div>

                {validationError ? (
                  <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                    <AlertCircle className="size-3.5" aria-hidden />
                    {validationError}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Lightbulb className="size-3.5 shrink-0 text-amber-500" aria-hidden />
                    Answers cannot be empty, and each question is graded only once.
                  </p>
                  <Button
                    type="submit"
                    disabled={!answer.trim() || alreadyAnswered}
                    icon={<Send className="size-4" aria-hidden />}
                  >
                    Submit Answer
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </div>

      {/* Feedback */}
      {showFeedback && latest ? (
        <div className="mt-6">
          <EvaluationView evaluation={latest} questionType={currentQuestion?.type} />
          <div className="animate-fade-up mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              size="lg"
              onClick={handleNext}
              icon={<ArrowRight className="size-4" aria-hidden />}
            >
              {isLastQuestion ? 'Finish and see results' : 'Continue to next question'}
            </Button>
          </div>
        </div>
      ) : null}

      {expired && !isEvaluating && !showFeedback && !alreadyAnswered ? (
        <div className="mt-5 flex justify-end">
          <Button variant="secondary" onClick={handleNext} icon={<ArrowRight className="size-4" aria-hidden />}>
            {isLastQuestion ? 'Finish interview' : 'Skip to next question'}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={showExitConfirm}
        title="Leave this interview?"
        description="Your graded answers are saved, and you can resume the remaining questions later from the Home page or History. Answering nothing means no report is generated."
        confirmLabel="Leave interview"
        cancelLabel="Stay"
        destructive
        onConfirm={() => {
          setShowExitConfirm(false);
          navigate('/');
        }}
        onCancel={() => setShowExitConfirm(false)}
      />
    </div>
  );
}
