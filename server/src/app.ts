import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import type { ApiErrorBody } from '../../shared/types.js';
import { isProduction } from './env.js';
import { AppError } from './lib/errors.js';
import { interviewRouter } from './routes/interview.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Find the repository root by walking up from this file until we see the
 * workspace root (it owns client/ and server/). This works whether the server
 * runs from source (server/src) or from the build (server/dist/server/src).
 */
function findRepoRoot(start: string): string {
  let current = start;
  for (let depth = 0; depth < 6; depth += 1) {
    if (
      fs.existsSync(path.join(current, 'client', 'package.json')) &&
      fs.existsSync(path.join(current, 'server', 'package.json'))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(start, '..', '..');
}

const repoRoot = findRepoRoot(here);
const clientDist = path.join(repoRoot, 'client', 'dist');

export function createApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // The SPA is served from the same origin; CSP is kept permissive enough
      // for Vite's inlined styles but still blocks arbitrary script origins.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          // In development the app is often embedded in a preview iframe on a
          // different host, so framing is allowed there. Production stays locked
          // down against clickjacking.
          frameAncestors: isProduction ? ["'self'"] : ['*'],
        },
      },
      // X-Frame-Options has no way to allow a single arbitrary preview origin;
      // the CSP frame-ancestors directive above is the modern replacement.
      frameguard: isProduction ? { action: 'sameorigin' } : false,
      crossOriginEmbedderPolicy: false,
      // Required so the app can render inside the preview iframe.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(express.json({ limit: '256kb' }));

  app.use('/api/interview', interviewRouter);

  app.use('/api', (_req, res) => {
    const body: ApiErrorBody = {
      error: { code: 'not_found', message: 'That API endpoint does not exist.' },
    };
    res.status(404).json(body);
  });

  // In production the Express server also serves the built SPA, so the whole
  // app runs on one origin and the API key never has to leave the server.
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'), (error) => {
      if (error) {
        res
          .status(503)
          .type('text/plain')
          .send(
            'Client build not found. Run "npm run build" from the repository root, or use "npm run dev" for development.',
          );
      }
    });
  });

  // Central error handler: never leak stack traces or the API key.
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof AppError) {
      const body: ApiErrorBody = {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      };
      res.status(error.status).json(body);
      return;
    }

    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({
        error: { code: 'bad_request', message: 'The request body is not valid JSON.' },
      } satisfies ApiErrorBody);
      return;
    }

    console.error('[server] unhandled error:', error);
    res.status(500).json({
      error: { code: 'server_error', message: 'Something went wrong on the server. Please try again.' },
    } satisfies ApiErrorBody);
  });

  return app;
}
