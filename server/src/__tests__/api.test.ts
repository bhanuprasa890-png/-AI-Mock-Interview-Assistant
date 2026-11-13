import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { resetRateLimits } from '../routes/interview.js';

const app = createApp();

const config = { role: 'Python Developer', experience: 'Fresher', difficulty: 'Medium' };

beforeEach(() => resetRateLimits());

describe('GET /api/health', () => {
  it('reports simulator mode in tests', async () => {
    const res = await request(app).get('/api/interview/health').expect(200);
    expect(res.body).toMatchObject({ ok: true, simulated: true });
    expect(JSON.stringify(res.body)).not.toContain('key');
  });
});

describe('POST /api/interview/questions', () => {
  it('returns 3 technical + 2 HR questions', async () => {
    const res = await request(app)
      .post('/api/interview/questions')
      .send({ config })
      .expect(200);

    expect(res.body.questions).toHaveLength(5);
    expect(res.body.questions.filter((q: { type: string }) => q.type === 'technical')).toHaveLength(3);
    expect(res.body.questions.filter((q: { type: string }) => q.type === 'hr')).toHaveLength(2);
    expect(res.body.simulated).toBe(true);
  });

  it('avoids previously seen questions', async () => {
    const first = await request(app).post('/api/interview/questions').send({ config }).expect(200);
    const seen = first.body.questions.map((q: { question: string }) => q.question);

    const second = await request(app)
      .post('/api/interview/questions')
      .send({ config, previousQuestions: seen })
      .expect(200);

    const secondTexts = second.body.questions.map((q: { question: string }) => q.question);
    expect(secondTexts.some((text: string) => seen.includes(text))).toBe(false);
  });

  it('rejects an unknown role with field-level details', async () => {
    const res = await request(app)
      .post('/api/interview/questions')
      .send({ config: { ...config, role: 'Astronaut' } })
      .expect(400);

    expect(res.body.error.code).toBe('bad_request');
    expect(res.body.error.details['config.role']).toBeTruthy();
  });
});

describe('POST /api/interview/evaluate', () => {
  const question = {
    id: 'q1',
    type: 'technical',
    question: 'What is the difference between a list and a tuple?',
  };

  it('grades an answer and echoes the question id', async () => {
    const res = await request(app)
      .post('/api/interview/evaluate')
      .send({ config, question, answer: 'A list is mutable because you can append to it, a tuple is immutable.' })
      .expect(200);

    expect(res.body.questionId).toBe('q1');
    expect(res.body.score).toBeGreaterThanOrEqual(0);
    expect(res.body.score).toBeLessThanOrEqual(10);
    expect(res.body.good.length).toBeGreaterThan(0);
    expect(res.body.improvedAnswer.length).toBeGreaterThan(20);
  });

  it('rejects an empty answer', async () => {
    const res = await request(app)
      .post('/api/interview/evaluate')
      .send({ config, question, answer: '   ' })
      .expect(400);
    expect(res.body.error.code).toBe('bad_request');
  });

  it('rejects an over-long answer', async () => {
    await request(app)
      .post('/api/interview/evaluate')
      .send({ config, question, answer: 'a'.repeat(4001) })
      .expect(400);
  });
});

describe('POST /api/interview/summary', () => {
  it('writes a summary from the transcript', async () => {
    const res = await request(app)
      .post('/api/interview/summary')
      .send({
        config,
        items: [
          { question: 'Q1', type: 'technical', answer: 'A1', score: 7 },
          { question: 'Q2', type: 'hr', answer: 'A2', score: 8 },
        ],
      })
      .expect(200);

    expect(res.body.overall.length).toBeGreaterThan(20);
    expect(res.body.strongestAreas.length).toBeGreaterThan(0);
  });
});

describe('unknown routes', () => {
  it('returns a JSON 404 for unknown API paths', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('returns a friendly 503 when the client build is absent', async () => {
    const res = await request(app).get('/some/spa/route');
    expect([200, 503]).toContain(res.status);
  });
});

describe('rate limiting', () => {
  it('blocks excessive requests from one client', async () => {
    for (let i = 0; i < 20; i += 1) {
      await request(app).post('/api/interview/questions').send({ config });
    }
    const res = await request(app).post('/api/interview/questions').send({ config }).expect(429);
    expect(res.body.error.code).toBe('rate_limited');
  });
});
