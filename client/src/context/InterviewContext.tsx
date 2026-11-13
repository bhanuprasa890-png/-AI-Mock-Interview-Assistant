import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  Evaluation,
  FinalSummary,
  InterviewConfig,
  InterviewQuestion,
  InterviewRecord,
  InterviewRecordItem,
} from '@shared/types';
import { MAX_TOTAL_SCORE } from '@shared/types';
import { api, ApiError } from '../api/client';
import {
  addSeenQuestions,
  clearActive,
  computeTotals,
  loadActive,
  loadHistory,
  loadSeenQuestions,
  newId,
  saveActive,
  saveLastConfig,
  saveRecord,
  type ActiveInterview,
} from '../lib/storage';

/**
 * Interview state machine.
 *
 * A single context owns the in-progress interview so every page (setup,
 * interview, feedback, results) reads and writes the same source of truth.
 * Progress is mirrored to localStorage after each change, so a refresh or a
 * closed tab does not lose the interview.
 */

export type Phase =
  | 'idle'
  | 'loading-questions'
  | 'answering'
  | 'evaluating'
  | 'feedback'
  | 'scoring'
  | 'complete';

interface InterviewState {
  phase: Phase;
  recordId: string | null;
  config: InterviewConfig | null;
  questions: InterviewQuestion[];
  items: InterviewRecordItem[];
  currentIndex: number;
  latest: Evaluation | null;
  summary: FinalSummary | null;
  simulated: boolean;
  error: string | null;
  startedAt: string | null;
}

const initialState: InterviewState = {
  phase: 'idle',
  recordId: null,
  config: null,
  questions: [],
  items: [],
  currentIndex: 0,
  latest: null,
  summary: null,
  simulated: false,
  error: null,
  startedAt: null,
};

interface InterviewContextValue extends InterviewState {
  /** True when a resumable, unfinished interview exists on this device. */
  hasActive: boolean;
  currentQuestion: InterviewQuestion | null;
  progress: { current: number; total: number };
  totals: { score: number; maxScore: number; percentage: number };
  startInterview: (config: InterviewConfig) => Promise<void>;
  resumeInterview: () => void;
  /** Resolves to true when the answer was graded and feedback is available. */
  submitAnswer: (answer: string, timeSpentSeconds: number) => Promise<boolean>;
  nextQuestion: () => void;
  finishInterview: () => Promise<void>;
  retrySummary: () => Promise<void>;
  discardActive: () => void;
  resetInterview: () => void;
  /** Restart with fresh questions, avoiding everything already seen. */
  restartInterview: (config?: InterviewConfig) => Promise<void>;
  clearError: () => void;
}

const InterviewContext = createContext<InterviewContextValue | null>(null);

function itemToEvaluation(item: InterviewRecordItem): Evaluation {
  return {
    score: item.score,
    scores: item.scores,
    good: item.good,
    missing: item.missing,
    suggestions: item.suggestions,
    improvedAnswer: item.improvedAnswer,
    simulated: item.simulated ?? false,
  };
}

function buildRecord(
  id: string,
  config: InterviewConfig,
  questions: InterviewQuestion[],
  items: InterviewRecordItem[],
  summary: FinalSummary | null,
  status: InterviewRecord['status'],
  createdAt: string,
): InterviewRecord {
  const totals = computeTotals(items);
  return {
    id,
    createdAt,
    completedAt: status === 'completed' ? new Date().toISOString() : null,
    config,
    questions,
    items,
    score: totals.score,
    maxScore: MAX_TOTAL_SCORE,
    percentage: totals.percentage,
    summary,
    status,
  };
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}

export function readActiveOrNull(): ActiveInterview | null {
  try {
    return loadActive();
  } catch {
    return null;
  }
}

export function InterviewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InterviewState>(initialState);
  const [hasActive, setHasActive] = useState<boolean>(() => Boolean(readActiveOrNull()));

  // Mirror of state for async flows that must not capture a stale snapshot.
  const stateRef = useRef(state);
  stateRef.current = state;

  const abortRef = useRef<AbortController | null>(null);
  const summaryLock = useRef(false);

  const reset = useCallback((next: Partial<InterviewState> = {}) => {
    setState({ ...initialState, ...next });
  }, []);

  // Persist the active interview whenever it changes.
  useEffect(() => {
    if (state.phase === 'complete' || state.phase === 'idle' || !state.recordId || !state.config) return;
    const active: ActiveInterview = {
      recordId: state.recordId,
      config: state.config,
      questions: state.questions,
      items: state.items,
      currentIndex: state.currentIndex,
      startedAt: state.startedAt ?? new Date().toISOString(),
      simulated: state.simulated,
    };
    saveActive(active);
    setHasActive(true);
  }, [state]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const persistRecord = useCallback((next: InterviewState, summary: FinalSummary | null, status: InterviewRecord['status']) => {
    if (!next.recordId || !next.config) return;
    // Nothing graded yet: keep it out of History until there is a score.
    if (status === 'in_progress' && next.items.length === 0) return;
    saveRecord(
      buildRecord(
        next.recordId,
        next.config,
        next.questions,
        next.items,
        summary,
        status,
        next.startedAt ?? new Date().toISOString(),
      ),
    );
  }, []);

  const startInterview = useCallback(
    async (config: InterviewConfig) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ ...initialState, phase: 'loading-questions', config });

      try {
        const seen = [...new Set(loadSeenQuestions())];
        const response = await api.generateQuestions(config, seen, controller.signal);
        const startedAt = new Date().toISOString();
        addSeenQuestions(response.questions.map((question) => question.question));
        saveLastConfig(config);
        setState({
          phase: 'answering',
          recordId: newId(),
          config,
          questions: response.questions,
          items: [],
          currentIndex: 0,
          latest: null,
          summary: null,
          simulated: response.simulated,
          error: null,
          startedAt,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        reset({ error: messageFor(error), config });
      }
    },
    [reset],
  );

  const resumeInterview = useCallback(() => {
    const active = readActiveOrNull();
    if (!active) {
      setHasActive(false);
      return;
    }

    const index = Math.min(Math.max(0, active.currentIndex), active.questions.length - 1);
    const answered = active.items.find((item) => item.questionId === active.questions[index]?.id);
    const allAnswered = active.items.length >= active.questions.length;

    setState({
      phase: allAnswered ? 'scoring' : answered ? 'feedback' : 'answering',
      recordId: active.recordId,
      config: active.config,
      questions: active.questions,
      items: active.items,
      currentIndex: index,
      latest: answered ? itemToEvaluation(answered) : null,
      summary: null,
      simulated: active.simulated,
      error: null,
      startedAt: active.startedAt,
    });
  }, []);

  const submitAnswer = useCallback(async (answer: string, timeSpentSeconds: number) => {
    const snapshot = stateRef.current;
    const question = snapshot.questions[snapshot.currentIndex];
    const trimmed = answer.trim();

    // Guards: non-empty, one grading per question, no submit while grading.
    if (!snapshot.config || !question) return false;
    if (!trimmed) {
      setState((prev) => ({ ...prev, error: 'Please write an answer before submitting.' }));
      return false;
    }
    if (snapshot.phase === 'evaluating' || snapshot.phase === 'feedback') return false;
    if (snapshot.items.some((item) => item.questionId === question.id)) return false;

    const controller = new AbortController();
    abortRef.current = controller;
    setState((prev) => ({ ...prev, phase: 'evaluating', error: null }));

    try {
      const result = await api.evaluateAnswer(
        { config: snapshot.config, question, answer: trimmed },
        controller.signal,
      );

      const item: InterviewRecordItem = {
        questionId: question.id,
        type: question.type,
        question: question.question,
        answer: trimmed,
        score: result.score,
        scores: result.scores,
        good: result.good,
        missing: result.missing,
        suggestions: result.suggestions,
        improvedAnswer: result.improvedAnswer,
        timeSpentSeconds: Math.max(0, Math.round(timeSpentSeconds)),
        simulated: result.simulated,
      };

      setState((prev) => {
        const items = [...prev.items.filter((existing) => existing.questionId !== question.id), item];
        const next: InterviewState = { ...prev, phase: 'feedback', items, latest: result, error: null };
        persistRecord(next, null, 'in_progress');
        return next;
      });
      return true;
    } catch (error) {
      if (controller.signal.aborted) return false;
      setState((prev) => ({ ...prev, phase: 'answering', error: messageFor(error) }));
      return false;
    }
  }, [persistRecord]);

  const nextQuestion = useCallback(() => {
    setState((prev) => {
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= prev.questions.length) {
        return { ...prev, phase: 'scoring', latest: null, error: null };
      }
      return { ...prev, currentIndex: nextIndex, phase: 'answering', latest: null, error: null };
    });
  }, []);

  const finishInterview = useCallback(async () => {
    // Idempotent: React strict mode and button double-clicks must not fire twice.
    if (summaryLock.current) return;
    const snapshot = stateRef.current;
    if (!snapshot.config || snapshot.items.length === 0) return;
    if (snapshot.summary) {
      setState((prev) => ({ ...prev, phase: 'complete' }));
      return;
    }

    summaryLock.current = true;
    setState((prev) => ({ ...prev, phase: 'scoring', error: null }));

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const summary = await api.getSummary(
        {
          config: snapshot.config,
          items: snapshot.items.map((item) => ({
            question: item.question,
            type: item.type,
            answer: item.answer,
            score: item.score,
          })),
        },
        controller.signal,
      );

      setState((prev) => {
        const next: InterviewState = { ...prev, phase: 'complete', summary, error: null };
        persistRecord(next, summary, 'completed');
        return next;
      });
      clearActive();
      setHasActive(false);
    } catch (error) {
      if (controller.signal.aborted) {
        summaryLock.current = false;
        return;
      }
      setState((prev) => ({ ...prev, phase: 'scoring', error: messageFor(error) }));
    } finally {
      summaryLock.current = false;
    }
  }, [persistRecord]);

  const retrySummary = finishInterview;

  const discardActive = useCallback(() => {
    abortRef.current?.abort();
    clearActive();
    setHasActive(false);
    reset();
  }, [reset]);

  const resetInterview = useCallback(() => {
    abortRef.current?.abort();
    reset();
  }, [reset]);

  const restartInterview = useCallback(
    async (config?: InterviewConfig) => {
      const target = config ?? stateRef.current.config ?? loadHistory()[0]?.config;
      reset();
      if (target) await startInterview(target);
    },
    [reset, startInterview],
  );

  const clearError = useCallback(() => setState((prev) => ({ ...prev, error: null })), []);

  const currentQuestion = state.questions[state.currentIndex] ?? null;
  const totals = useMemo(() => computeTotals(state.items), [state.items]);

  const value: InterviewContextValue = {
    ...state,
    hasActive,
    currentQuestion,
    progress: {
      current: Math.min(state.currentIndex + 1, state.questions.length || 1),
      total: state.questions.length,
    },
    totals,
    startInterview,
    resumeInterview,
    submitAnswer,
    nextQuestion,
    finishInterview,
    retrySummary,
    discardActive,
    resetInterview,
    restartInterview,
    clearError,
  };

  return <InterviewContext.Provider value={value}>{children}</InterviewContext.Provider>;
}

export function useInterview(): InterviewContextValue {
  const context = useContext(InterviewContext);
  if (!context) throw new Error('useInterview must be used inside <InterviewProvider>');
  return context;
}
