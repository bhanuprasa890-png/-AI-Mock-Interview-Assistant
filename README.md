# InterviewMate AI

> **Practice Smarter. Interview Better.**

An AI-powered mock interview assistant for students and early-career developers.
Pick a job role, experience level and difficulty; InterviewMate AI generates a
fresh set of **5 questions (3 technical + 2 HR)** with Google Gemini, scores each
answer out of 10, and produces a final report out of 50.

---

## Table of contents

1. [What it does](#what-it-does)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Quick start](#quick-start)
5. [Environment variables](#environment-variables)
6. [Available scripts](#available-scripts)
7. [How the AI integration works](#how-the-ai-integration-works)
8. [API reference](#api-reference)
9. [Data storage](#data-storage)
10. [Testing](#testing)
11. [Production build & deployment](#production-build--deployment)
12. [Connecting this folder to GitHub](#connecting-this-folder-to-github)
13. [Troubleshooting](#troubleshooting)

---

## What it does

| Page | Route | What happens |
| --- | --- | --- |
| Landing | `/` | Product intro, feature cards, primary **Start Interview** call to action. Shows a resume banner if an interview is unfinished. |
| Setup | `/setup` | Choose one of 7 job roles, Fresher/Experienced, Easy/Medium/Hard. Asks for confirmation before discarding an unfinished interview. |
| Interview | `/interview` | One question at a time, 3 technical + 2 HR, progress bar, 2-minute countdown per question, textarea, **Submit Answer**. Empty answers and duplicate submissions are blocked. |
| Feedback | `/interview` (inline) | After each submission: score out of 10, per-dimension scores, what was good, what was missing, suggestions, and a stronger sample answer. |
| Results | `/results` | Total out of 50, percentage, overall summary, strongest areas, areas to improve, future suggestions, and **Restart Interview** with a brand-new question set. |
| History | `/history` | Every saved interview, a performance summary (count, average, best, trend), filters, per-interview review and delete. |
| Saved result | `/history/:id` | Full replay of a past interview, question by question, including the original answer and AI feedback. |

Other behaviours:

- **Fresh questions on restart** - previously seen questions are remembered and
  explicitly excluded (both in the prompt and server-side validation).
- **History in `localStorage`** - nothing is sent to a database, so the app has
  no accounts and no personal data leaving the browser beyond the answer text
  that is graded by Gemini.
- **Resume support** - an unfinished interview is saved after every graded
  answer and can be resumed from the landing page, setup page or History.
- **Graceful failure** - every AI call has loading, retry and error states. If
  Gemini fails, the user sees a real error, never fake feedback.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS 4, lucide-react, React Router 7 |
| Backend | Node.js 20+, Express 4, TypeScript, Zod validation, Helmet |
| AI | Google Gemini (`gemini-2.5-flash` by default) via the server-side REST API |
| Tests | Vitest, Supertest (API), Testing Library + jsdom (UI flows) |

The Gemini API key is read on the server only. The browser never receives it -
it calls same-origin `/api/...` routes, which are proxied to Express in
development and served by Express in production.

---

## Project structure

```
.
├── client/                     # React + TypeScript + Vite front-end
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── api/client.ts       # typed fetch wrapper for /api/*
│   │   ├── components/
│   │   │   ├── feedback/       # EvaluationView (score + feedback blocks)
│   │   │   ├── layout/         # Navbar, Footer, ResumeBanner, SectionTitle
│   │   │   └── ui/             # Button, Card, ConfirmDialog, ProgressBar, ...
│   │   ├── context/            # InterviewContext - the interview state machine
│   │   ├── lib/                # storage (localStorage), formatting helpers
│   │   ├── pages/              # Landing, Setup, Interview, Results, History, ...
│   │   ├── __tests__/          # Vitest + Testing Library tests
│   │   ├── App.tsx             # routes
│   │   ├── main.tsx            # entry point
│   │   └── index.css           # Tailwind v4 theme + design tokens
│   ├── index.html
│   ├── vite.config.ts          # dev server + /api proxy
│   └── tsconfig*.json
├── server/                     # Express back-end (API + production static host)
│   ├── src/
│   │   ├── __tests__/          # Vitest + Supertest tests
│   │   ├── lib/                # errors, Zod schemas
│   │   ├── routes/interview.ts # /api/interview/* endpoints + rate limiting
│   │   ├── services/
│   │   │   ├── gemini.ts       # Gemini REST client (JSON mode, retries)
│   │   │   ├── prompts.ts      # system + user prompts
│   │   │   ├── interviewService.ts # question/evaluation/summary orchestration
│   │   │   ├── scoring.ts      # clamp, dedupe, question-set building
│   │   │   └── simulator.ts    # offline demo mode (never used as a fallback)
│   │   ├── app.ts              # Express app (Helmet, routes, SPA fallback)
│   │   ├── env.ts              # .env loading + config
│   │   └── index.ts            # server entry point
│   └── tsconfig.json
├── shared/                     # code shared by both apps
│   ├── types.ts                # domain types (single source of truth)
│   └── constants.ts            # roles, levels, difficulties, limits
├── .env.example
├── .gitignore
└── package.json                # npm workspaces + root scripts
```

`shared/` is imported by both workspaces with relative paths, so there is no
build step or publishing needed to keep the contract in sync.

---

## Quick start

**Requirements:** Node.js 20 or newer, npm 9+.

```bash
# 1. install dependencies for both workspaces
npm install

# 2. create your local env file
cp .env.example .env

# 3. add your Gemini key to .env  (https://aistudio.google.com/app/apikey)
#    GEMINI_API_KEY=your-key-here

# 4. run the API and the Vite dev server together
npm run dev
```

- Front-end: <http://localhost:5173>
- API: <http://localhost:8787> (the Vite dev server proxies `/api` to it)

### No API key yet?

Set `GEMINI_MOCK=true` in `.env` to run the app with a deterministic offline
simulator. This exists for local UI work and tests only:

- every simulated payload is flagged and the UI shows an amber **Simulated**
  badge;
- the server refuses to enable mock mode when `NODE_ENV=production`;
- it is **never** used as a fallback when a real Gemini call fails - failures
  surface as errors instead.

---

## Environment variables

All variables live in `.env` at the repository root (see `.env.example`).
`server/.env` is also read as a fallback. Real process environment variables
always take precedence.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | Yes (unless mocking) | – | Google Gemini API key. Server-side only. |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model id used for all three calls. |
| `PORT` | No | `8787` | Express port. |
| `GEMINI_MOCK` | No | `false` | Offline simulator for local UI/testing. Ignored in production. |
| `GEMINI_TIMEOUT_MS` | No | `30000` | Per-request timeout for Gemini calls. |

> `.env` is git-ignored. Never commit a real key. If a key is ever exposed,
> revoke it in Google AI Studio and issue a new one.

---

## Available scripts

Run from the repository root:

| Command | What it does |
| --- | --- |
| `npm run dev` | Express (watch mode) + Vite dev server with `/api` proxy. |
| `npm run build` | Type-check and build the client, then compile the server. |
| `npm start` | Start the production server, which also serves `client/dist`. |
| `npm test` | Run server and client test suites. |
| `npm run typecheck` | Type-check both workspaces without emitting. |

Workspace-specific: `npm run <script> --workspace client` / `--workspace server`.

---

## How the AI integration works

Three prompts, three strictly-typed JSON responses:

1. **Question generation** (`POST /api/interview/questions`)
   The model receives the role, experience level and difficulty plus a list of
   questions the candidate has already seen. It must return
   `{ questions: [{ type, question, focus }] }`. The server then:
   - normalises and de-duplicates (exact + 85% token overlap),
   - drops repeats of previously seen questions,
   - enforces exactly 3 `technical` + 2 `hr` and renumbers `q1`..`q5`,
   - retries once with a stricter prompt if the shape is wrong, then fails
     loudly with a clear message rather than shipping a broken interview.

2. **Answer evaluation** (`POST /api/interview/evaluate`)
   The candidate's answer is passed as data inside markers, with an explicit
   instruction that answer text must never be treated as instructions. The model
   returns a score out of 10, five dimension scores (technical correctness,
   relevance, clarity, completeness, communication), good/missing/suggestions
   bullets and a rewritten model answer. Zod validates every field before it is
   trusted; one automatic retry covers malformed output.

3. **Final summary** (`POST /api/interview/summary`)
   The transcript (question, type, score, answer excerpt) produces the overall
   paragraph, strongest areas, improvement areas and future suggestions.

Reliability and safety measures:

- `responseMimeType: application/json` plus fence-stripping JSON extraction.
- Zod schema validation of all model output, with clamping to valid ranges.
- Timeouts, exponential-backoff retries for 429/5xx/network errors.
- Per-IP rate limiting on each endpoint (in-memory, per process).
- Request body size limit (256 kB) and answer length cap (4000 characters).
- Helmet security headers; the API returns structured errors and never leaks
  stack traces or the API key.
- The key travels in the `x-goog-api-key` header, never in a URL.

---

## API reference

All endpoints are JSON. Errors always have the shape
`{ "error": { "code": "...", "message": "...", "details"?: {...} } }`.

### `GET /api/interview/health`

```json
{ "ok": true, "aiConfigured": true, "simulated": false, "model": "gemini-2.5-flash" }
```

### `POST /api/interview/questions`

```json
{
  "config": { "role": "Frontend Developer", "experience": "Fresher", "difficulty": "Medium" },
  "previousQuestions": ["What is the virtual DOM?"]
}
```

```json
{
  "questions": [
    { "id": "q1", "type": "technical", "question": "...", "focus": "..." },
    { "id": "q4", "type": "hr", "question": "...", "focus": "..." }
  ],
  "generatedAt": "2026-01-01T10:00:00.000Z",
  "simulated": false
}
```

### `POST /api/interview/evaluate`

```json
{
  "config": { "role": "Python Developer", "experience": "Fresher", "difficulty": "Easy" },
  "question": { "id": "q1", "type": "technical", "question": "What is a decorator?" },
  "answer": "A decorator wraps a function to add behaviour without changing it..."
}
```

```json
{
  "questionId": "q1",
  "score": 7.5,
  "scores": {
    "technicalCorrectness": 8,
    "relevance": 8,
    "clarity": 7,
    "completeness": 6,
    "communication": 8
  },
  "good": ["Precise definition of the wrapping behaviour"],
  "missing": ["No example of @wraps or argument forwarding"],
  "suggestions": ["Show a 4-line example of a timing decorator"],
  "improvedAnswer": "...",
  "simulated": false
}
```

### `POST /api/interview/summary`

```json
{
  "config": { "...": "..." },
  "items": [
    { "question": "...", "type": "technical", "answer": "...", "score": 7.5 }
  ]
}
```

```json
{
  "overall": "...",
  "strongestAreas": ["..."],
  "improvementAreas": ["..."],
  "futureSuggestions": ["..."],
  "simulated": false
}
```

### Error codes

| HTTP | `code` | Meaning |
| --- | --- | --- |
| 400 | `bad_request` | Validation failed; `details` maps field → message. |
| 404 | `not_found` | Unknown API route. |
| 429 | `rate_limited` | Too many requests; wait and retry. |
| 502 | `model_error` | Gemini failed or returned unusable JSON. |
| 503 | `missing_api_key` | No key, or Gemini rejected the configured key. |
| 500 | `server_error` | Unexpected server failure. |

---

## Data storage

Everything is client-side, keyed in `localStorage`:

| Key | Contents |
| --- | --- |
| `interviewmate.history.v1` | Saved interviews (config, questions, graded answers, feedback, summary). Capped at 40. |
| `interviewmate.active.v1` | The in-progress interview, so it can be resumed. |
| `interviewmate.seenQuestions.v1` | Recently seen question texts (max 60) to avoid repeats. |
| `interviewmate.lastConfig.v1` | Last chosen role/level/difficulty, pre-filled on setup. |

Corrupted or unavailable storage (private mode, disabled cookies) is handled
gracefully - the app keeps working for the current session.

---

## Testing

```bash
npm test              # everything
npm run test --workspace server
npm run test --workspace client
```

- **Server (24 tests)** - question-set normalisation (3+2 split, de-duplication,
  previously-seen filtering), score clamping, JSON fence extraction, every API
  route including validation failures, empty/over-long answers, rate limiting,
  JSON 404s and SPA fallback.
- **Client (21 tests)** - storage round-trips and corruption handling, totals and
  percentage maths, formatting helpers, plus full UI flow tests: landing page,
  setup selection → start, empty-submit blocking, five graded answers → feedback
  → final report, in-progress persistence, and history review.

The UI tests stub `fetch`, so they run in milliseconds and need no API key.

---

## Production build & deployment

```bash
npm run build     # builds client/dist and server/dist
NODE_ENV=production npm start
```

In production, Express serves `client/dist` and the API from a **single origin**,
so there is no CORS configuration to get wrong and the key stays server-side.

Deployment notes:

- Set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) in your host's
  environment. Do **not** commit `.env`.
- Never set `GEMINI_MOCK` in production - it is ignored when
  `NODE_ENV=production`, by design.
- Any Node host works (Render, Railway, Fly.io, a VPS, Docker). The app listens
  on `0.0.0.0:$PORT`.
- If you host the front-end separately (e.g. Netlify) from the API, point the
  client at the API origin via your platform's proxy/rewrite for `/api` - the
  client always calls same-origin `/api/...`.

---

## Connecting this folder to GitHub

This project was developed locally. **No GitHub repository has been created and
nothing has been pushed yet.** To publish it yourself:

```bash
# from this folder
git init                     # only if it is not already a git repo
git add .
git commit -m "InterviewMate AI: AI mock interview assistant"

# create an empty repo on github.com (no README, no .gitignore), then:
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Then, on the repository page, add your key as a repository secret only if you
build a CI workflow that needs it - the app itself reads the key from the runtime
environment, not from source control.

Before your first push, confirm no secrets are staged:

```bash
git status --short
git grep -n "AIza" || echo "No API keys found"
```

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `The AI service is not configured` (503) | `GEMINI_API_KEY` is missing or empty in `.env`. Restart the server after editing `.env`. |
| `The AI service rejected the configured API key` | The key is invalid, revoked, or lacks access to the chosen model. Generate a new key and check `GEMINI_MODEL`. |
| `Could not reach the server` in the browser | The Express server is not running, or the port differs from the Vite proxy target. Start with `npm run dev`. |
| `429` / `rate_limited` | You hit the per-IP limit while testing. Wait a minute, or restart the server to reset the in-memory buckets. |
| Questions look generic and show a **Simulated** badge | `GEMINI_MOCK=true` is set. Unset it and provide a real key. |
| History is empty after switching browsers | History is per-browser `localStorage`; it does not sync across devices. |
| Port already in use | Change `PORT` in `.env` and set `API_TARGET` (e.g. `API_TARGET=http://127.0.0.1:9000`) when running the Vite dev server. |
