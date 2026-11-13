import { createApp } from './app.js';
import { env, hasGeminiCredentials } from './env.js';

const app = createApp();

const server = app.listen(env.port, '0.0.0.0', () => {
  console.log(`\n  InterviewMate AI server running on http://localhost:${env.port}`);

  if (env.mock) {
    console.warn(
      '  ⚠  GEMINI_MOCK is enabled - responses are SIMULATED, not AI generated.\n' +
        '     Unset GEMINI_MOCK and set GEMINI_API_KEY for real questions and feedback.\n',
    );
  } else if (!hasGeminiCredentials()) {
    console.warn(
      '  ⚠  GEMINI_API_KEY is not set.\n' +
        '     Copy .env.example to .env and add your key from https://aistudio.google.com/app/apikey\n',
    );
  } else {
    console.log(`  Gemini model: ${env.geminiModel}\n`);
  }
});

const shutdown = (signal: string) => {
  console.log(`\n[server] ${signal} received, shutting down.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
