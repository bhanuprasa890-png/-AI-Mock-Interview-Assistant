import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InterviewQuestion } from '@shared/types';
import App from '../App';
import { InterviewProvider } from '../context/InterviewContext';

const questions: InterviewQuestion[] = [
  { id: 'q1', type: 'technical', question: 'What is the difference between a list and a tuple?' },
  { id: 'q2', type: 'technical', question: 'How does Python manage memory?' },
  { id: 'q3', type: 'technical', question: 'How do you structure a Python project?' },
  { id: 'q4', type: 'hr', question: 'Tell me about a project you are proud of.' },
  { id: 'q5', type: 'hr', question: 'Describe a time you received feedback.' },
];

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function evaluation(score: number) {
  return {
    questionId: 'q',
    score,
    scores: {
      technicalCorrectness: score,
      relevance: score,
      clarity: score,
      completeness: score,
      communication: score,
    },
    good: ['Clear opening definition'],
    missing: ['No concrete example'],
    suggestions: ['Add a worked example'],
    improvedAnswer: 'A stronger answer would define the concept and give a concrete example from a project.',
    simulated: false,
  };
}

function mockApi(overrides: { failQuestions?: boolean } = {}) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};

    if (url.includes('/api/interview/questions')) {
      if (overrides.failQuestions) {
        return jsonResponse(
          { error: { code: 'model_error', message: 'The AI service is temporarily unavailable.' } },
          502,
        );
      }
      return jsonResponse({ questions, generatedAt: new Date().toISOString(), simulated: false });
    }
    if (url.includes('/api/interview/evaluate')) {
      return jsonResponse({ ...evaluation(7.5), questionId: body.question?.id ?? 'q1' });
    }
    if (url.includes('/api/interview/summary')) {
      return jsonResponse({
        overall: 'You handled the technical questions well and stayed calm on the behavioural ones.',
        strongestAreas: ['Clarity of explanation', 'Role-relevant examples'],
        improvementAreas: ['Add measurable outcomes', 'Go deeper on trade-offs'],
        futureSuggestions: ['Rehearse out loud', 'Prepare two project stories'],
        simulated: false,
      });
    }
    return jsonResponse({ error: { code: 'not_found', message: 'nope' } }, 404);
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <InterviewProvider>
        <App />
      </InterviewProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('landing page', () => {
  it('renders the headline and primary call to action', () => {
    renderApp('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Practice Smarter.');
    expect(screen.getAllByRole('link', { name: /start interview/i }).length).toBeGreaterThan(0);
    expect(screen.getByText('AI-generated questions')).toBeInTheDocument();
    expect(screen.getByText('Instant AI feedback')).toBeInTheDocument();
    expect(screen.getByText('Performance tracking')).toBeInTheDocument();
  });

  it('shows the 404 page for unknown routes with a way back', () => {
    renderApp('/does-not-exist');
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back home/i })).toBeInTheDocument();
  });
});

describe('setup page', () => {
  it('lets the user choose every option and start an interview', async () => {
    const fetchMock = mockApi();
    const user = userEvent.setup();
    renderApp('/setup');

    await user.click(screen.getByRole('button', { name: /Data Analyst/ }));
    await user.click(screen.getByRole('button', { name: /Experienced/ }));
    await user.click(screen.getByRole('button', { name: /^Hard/ }));

    expect(screen.getByRole('button', { name: /Data Analyst/ })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /^Start Interview$/ }));

    await waitFor(() =>
      expect(screen.getByText('Question 1 of 5')).toBeInTheDocument(),
    );

    const questionsCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/api/interview/questions'),
    );
    expect(questionsCall).toBeTruthy();
    const payload = JSON.parse(String(questionsCall?.[1]?.body));
    expect(payload.config).toEqual({
      role: 'Data Analyst',
      experience: 'Experienced',
      difficulty: 'Hard',
    });
  });

  it('surfaces a server error and lets the user retry', async () => {
    mockApi({ failQuestions: true });
    const user = userEvent.setup();
    renderApp('/setup');

    await user.click(screen.getByRole('button', { name: /^Start Interview$/ }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});

describe('full interview flow', () => {
  it('grades five answers, blocks empty submits and produces a final report', async () => {
    const fetchMock = mockApi();
    const user = userEvent.setup();
    renderApp('/setup');

    await user.click(screen.getByRole('button', { name: /^Start Interview$/ }));
    await waitFor(() => expect(screen.getByText('Question 1 of 5')).toBeInTheDocument());

    // Empty submission is blocked client-side and never hits the API.
    const submit = screen.getByRole('button', { name: /submit answer/i });
    expect(submit).toBeDisabled();

    for (let index = 1; index <= 5; index += 1) {
      const textarea = screen.getByLabelText('Your answer');
      await user.type(textarea, `Answer number ${index} with a concrete project example and outcome.`);
      await user.click(screen.getByRole('button', { name: /submit answer/i }));

      await waitFor(() =>
        expect(screen.getByText('AI feedback on your answer')).toBeInTheDocument(),
      );
      expect(screen.getByText('What was good')).toBeInTheDocument();
      expect(screen.getByText('What was missing')).toBeInTheDocument();
      expect(screen.getByText('A stronger answer')).toBeInTheDocument();

      const continueButton = screen.getByRole('button', { name: /continue to next question|finish and see results/i });
      await user.click(continueButton);
      await waitFor(() => expect(screen.queryByText('AI feedback on your answer')).not.toBeInTheDocument());
    }

    // Final report.
    await waitFor(() => expect(screen.getByText('Your performance report')).toBeInTheDocument());
    expect(screen.getAllByText(/37\.5/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('75%').length).toBeGreaterThan(0);
    expect(screen.getByText('Overall performance summary')).toBeInTheDocument();
    expect(screen.getByText('Strongest areas')).toBeInTheDocument();
    expect(screen.getByText('Areas needing improvement')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restart interview/i })).toBeInTheDocument();

    // One evaluate call per question, no duplicates.
    const evaluateCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/evaluate'));
    expect(evaluateCalls).toHaveLength(5);
    const summaryCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/summary'));
    expect(summaryCalls).toHaveLength(1);

    // The completed interview is persisted for history review.
    const history = JSON.parse(localStorage.getItem('interviewmate.history.v1') ?? '[]');
    expect(history[0].status).toBe('completed');
    expect(history[0].items).toHaveLength(5);
    expect(localStorage.getItem('interviewmate.active.v1')).toBeNull();
  });

  it('saves the in-progress interview so it can be resumed', async () => {
    mockApi();
    const user = userEvent.setup();
    renderApp('/setup');

    await user.click(screen.getByRole('button', { name: /^Start Interview$/ }));
    await waitFor(() => expect(screen.getByText('Question 1 of 5')).toBeInTheDocument());

    await user.type(screen.getByLabelText('Your answer'), 'A list is mutable, a tuple is immutable.');
    await user.click(screen.getByRole('button', { name: /submit answer/i }));
    await waitFor(() => expect(screen.getByText('AI feedback on your answer')).toBeInTheDocument());

    const active = JSON.parse(localStorage.getItem('interviewmate.active.v1') ?? 'null');
    expect(active).not.toBeNull();
    expect(active.items).toHaveLength(1);
    expect(active.questions).toHaveLength(5);
  });
});

describe('history page', () => {
  it('shows an empty state with a call to action when nothing is saved', () => {
    renderApp('/history');
    expect(screen.getByText('No interviews yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start your first interview/i })).toBeInTheDocument();
  });

  it('lists saved interviews and opens a saved result for review', async () => {
    localStorage.setItem(
      'interviewmate.history.v1',
      JSON.stringify([
        {
          id: 'rec-1',
          createdAt: '2024-05-01T10:00:00.000Z',
          completedAt: '2024-05-01T10:10:00.000Z',
          config: { role: 'Java Developer', experience: 'Experienced', difficulty: 'Hard' },
          questions: [],
          items: [
            {
              questionId: 'q1',
              type: 'technical',
              question: 'Explain the difference between an interface and an abstract class.',
              answer: 'An interface declares behaviour, an abstract class shares state.',
              score: 8,
              scores: {
                technicalCorrectness: 8,
                relevance: 8,
                clarity: 8,
                completeness: 7,
                communication: 8,
              },
              good: ['Precise definitions'],
              missing: ['No Java example'],
              suggestions: ['Add a short code example'],
              improvedAnswer: 'An interface defines a contract with no state, while an abstract class can hold shared fields.',
              timeSpentSeconds: 60,
            },
          ],
          score: 8,
          maxScore: 50,
          percentage: 16,
          summary: {
            overall: 'A focused attempt with one strong answer.',
            strongestAreas: ['Definitions'],
            improvementAreas: ['Examples'],
            futureSuggestions: ['Practice code snippets'],
            simulated: false,
          },
          status: 'completed',
        },
      ]),
    );

    const user = userEvent.setup();
    renderApp('/history');

    expect(screen.getByText('Java Developer')).toBeInTheDocument();
    expect(screen.getByText('Performance summary')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /review result/i }));

    await waitFor(() => expect(screen.getByText('Java Developer interview')).toBeInTheDocument());
    expect(screen.getByText('Questions and feedback')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Explain the difference/ }));
    await waitFor(() => expect(screen.getByText('Your answer')).toBeInTheDocument());
    expect(
      screen.getByText('An interface declares behaviour, an abstract class shares state.'),
    ).toBeInTheDocument();
    expect(screen.getByText('AI feedback on your answer')).toBeInTheDocument();
    expect(screen.getAllByText(/An interface defines a contract/).length).toBeGreaterThan(0);
  });
});
