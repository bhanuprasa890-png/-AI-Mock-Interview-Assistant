/**
 * OFFLINE SIMULATOR - NOT AI.
 *
 * This module exists only so the app can be demoed and end-to-end tested
 * without a Gemini key (set GEMINI_MOCK=true). Every payload it produces is
 * flagged `simulated: true`, the client renders a visible "Simulated" badge,
 * and the server refuses to enable it when NODE_ENV=production.
 *
 * It is never used as a fallback for a failed Gemini call - in that case the
 * API returns an error so the user knows the evaluation did not happen.
 */
import type {
  Evaluation,
  FinalSummary,
  InterviewConfig,
  InterviewQuestion,
} from '../../../shared/types.js';
import { TOTAL_QUESTIONS } from '../../../shared/types.js';
import { clampScore } from './scoring.js';

const TECHNICAL_BANK: Record<string, string[]> = {
  'Python Developer': [
    'What is the difference between a Python list and a tuple, and when would you choose one over the other?',
    'How does Python handle memory management, and what role does the GIL play in concurrency?',
    'Explain how you would structure a Python project that needs unit tests and a reproducible dependency set.',
    'What are decorators in Python and what problem do they solve in real code?',

    'What is the difference between `is` and `==` in Python, and why does it matter?',
    'How would you handle a large CSV file in Python that does not fit in memory?',  ],
  'Web Developer': [
    'What happens in the browser between typing a URL and seeing the rendered page?',
    'How do you make a layout responsive without duplicating markup for mobile and desktop?',
    'What is the difference between cookies, localStorage and sessionStorage, and when would you use each?',
    'How would you debug a page that renders slowly on a mid-range phone?',

    'What is the difference between `let`, `const` and `var`, and why does scope matter?',
    'How do HTTP status codes 301, 302, 401 and 500 differ in practice?',  ],
  'Data Analyst': [
    'What is the difference between WHERE and HAVING in SQL, with an example of when each applies?',
    'How do you decide whether a dataset is clean enough for analysis, and what do you do about missing values?',
    'Explain the difference between correlation and causation using a business metric example.',
    'How would you present a drop in weekly signups to a non-technical stakeholder?',

    'What is a window function in SQL and when would you use one instead of GROUP BY?',
    'How would you validate that a dashboard metric is not double counting?',  ],
  'Java Developer': [
    'Explain the difference between an interface and an abstract class in Java, and when you would use each.',
    'How does the Java garbage collector decide when an object is eligible for collection?',
    'What is the difference between checked and unchecked exceptions, and how do you handle each?',
    'How would you design a class hierarchy that must stay backward compatible for existing callers?',

    'What is the difference between HashMap and TreeMap, and what are the trade-offs?',
    'How do you make a Spring service idempotent when a client retries a request?',  ],
  'AI/ML Engineer': [
    'What is the difference between overfitting and underfitting, and how do you detect each?',
    'How do precision, recall and F1 differ, and which would you optimise for a fraud detector?',
    'Explain how a train/validation/test split protects you from a misleading evaluation result.',
    'What steps would you take to move a notebook model into a production service?',

    'How would you handle a heavily imbalanced dataset for a classification model?',
    'What is the difference between a hyperparameter and a model parameter?',  ],
  'Frontend Developer': [
    'What problem do React hooks solve, and what are the rules for calling them?',
    'How do you decide between local component state, lifted state, and a global store?',
    'What causes unnecessary re-renders in React and how do you measure them?',
    'How do you build a form that stays accessible and usable with only a keyboard?',

    'How would you implement debounced search input, and why is it necessary?',
    'What is the difference between server-side and client-side rendering for a product page?',  ],
  'Backend Developer': [
    'How would you design a REST API for a resource that supports filtering, pagination and sorting?',
    'What is a database index, and when does adding one hurt rather than help?',
    'How do you make a write endpoint safe when the client retries the same request twice?',
    'Explain how you would add authentication and authorisation to an existing service.',

    'When would you choose a message queue over a synchronous API call?',
    'How do you design rate limiting for a public API?',  ],
};

const HR_BANK: Record<string, string[]> = {
  Fresher: [
    'Tell me about a project you built that you are proud of, and what you personally contributed.',
    'Describe a time you received feedback that changed how you work.',
    'How do you approach learning a technology you have never used before, under a deadline?',
    'Tell me about a disagreement in a team project and how you handled it.',

    'Why are you interested in this role, and what have you done to prepare for it?',
    'How would you respond if a teammate did not deliver their part before a deadline?',  ],
  Experienced: [
    'Describe a production issue you owned end to end. What did you change afterwards?',
    'Tell me about a time you disagreed with a senior stakeholder. How did you resolve it?',
    'How do you prioritise when two important deadlines collide?',
    'What is the most useful piece of feedback you have received, and what did you do with it?',

    'Tell me about a time you had to say no to a request. How did you communicate it?',
    'How do you mentor a junior engineer who is struggling to ship?',
  ],
};

/**
 * Deterministic pick that rotates through the bank. `offset` comes from the
 * number of questions already seen, so a restart surfaces a different slice.
 */
function pick<T>(items: T[], offset: number, count: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < count; i += 1) out.push(items[(offset + i) % items.length]);
  return out;
}

const normalise = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Build a simulated set. Questions the candidate has already seen are skipped,
 * so the restart requirement still holds in demo/offline mode.
 */
export function simulateQuestions(
  config: InterviewConfig,
  previousQuestions: string[],
): { questions: InterviewQuestion[]; simulated: true } {
  const technicalBank = TECHNICAL_BANK[config.role] ?? TECHNICAL_BANK['Python Developer'];
  const hrBank = HR_BANK[config.experience] ?? HR_BANK.Fresher;
  const seen = new Set(previousQuestions.map(normalise));

  const freshTechnical = technicalBank.filter((q) => !seen.has(normalise(q)));
  const freshHr = hrBank.filter((q) => !seen.has(normalise(q)));
  const offset = previousQuestions.length + config.difficulty.length;

  // If a bank is exhausted, fall back to the full bank rather than failing.
  const technicalPool = freshTechnical.length >= 3 ? freshTechnical : technicalBank;
  const hrPool = freshHr.length >= 2 ? freshHr : hrBank;

  const chosen = [
    ...pick(technicalPool, offset, 3).map((question) => ({ type: 'technical' as const, question })),
    ...pick(hrPool, offset, 2).map((question) => ({ type: 'hr' as const, question })),
  ].slice(0, TOTAL_QUESTIONS);

  return {
    simulated: true,
    questions: chosen.map((item, index) => ({
      id: `q${index + 1}`,
      type: item.type,
      question: item.question,
      focus: 'Simulated question set - enable GEMINI_API_KEY for tailored questions.',
    })),
  };
}

export function simulateEvaluation(
  question: InterviewQuestion,
  answer: string,
): Evaluation {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const lengthScore = Math.min(10, Math.max(1, Math.round((words.length / 70) * 10)));
  const base = clampScore(lengthScore * 0.85 + 1);
  const detailPenalty = answer.includes('because') || answer.includes('for example') ? 1 : 0;

  return {
    simulated: true,
    score: clampScore(base + detailPenalty),
    scores: {
      technicalCorrectness: clampScore(base),
      relevance: clampScore(base + 0.5),
      clarity: clampScore(base - 0.5),
      completeness: clampScore(base),
      communication: clampScore(base + 0.5),
    },
    good: [
      `You submitted ${words.length} words, which is enough for the interviewer to assess.`,
      'The answer stays on the topic of the question asked.',
    ],
    missing: [
      'Simulated feedback: enable GEMINI_API_KEY on the server for a real content review.',
      question.focus ? `A strong answer would cover: ${question.focus}` : 'Concrete examples and outcomes are missing.',
    ],
    suggestions: [
      'Structure the answer as situation, action and result so it is easy to follow.',
      'Quantify the impact where you can - numbers make answers memorable.',
    ],
    improvedAnswer:
      `A model answer to "${question.question}" would open with a one-line definition, ` +
      'explain the trade-offs with a concrete example from a project, and close with the outcome. ' +
      'This text is generated by the offline simulator and is not real AI feedback.',
  };
}

export function simulateSummary(config: InterviewConfig, scores: number[]): FinalSummary {
  const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const band = average >= 8 ? 'strong' : average >= 6 ? 'solid' : average >= 4 ? 'developing' : 'early';
  return {
    simulated: true,
    overall:
      `Simulated report for a ${config.role} interview at ${config.difficulty} difficulty. ` +
      `Your average answer score was ${average.toFixed(1)} out of 10, which is ${band}. ` +
      'This summary is produced by the offline simulator so no real AI review took place.',
    strongestAreas: ['Answer length and general relevance', 'Willingness to attempt every question'],
    improvementAreas: ['Concrete examples with measurable outcomes', 'Depth on role-specific trade-offs'],
    futureSuggestions: [
      'Rehearse answers out loud with a two-minute limit per question.',
      'Add GEMINI_API_KEY on the server to get real, content-aware feedback.',
      'Review your saved interviews in the History page and retry the weakest question type.',
    ],
  };
}
