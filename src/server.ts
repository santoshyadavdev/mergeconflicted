import { AngularAppEngine } from '@angular/ssr';
import { handleReviewRequest } from './server/review-handler';

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  REVIEWER_CACHE: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  };
  GEMINI_API_KEY: string;
  GITHUB_TOKEN?: string;
}

const angularApp = new AngularAppEngine();

const API_REVIEW_PATTERN = /^\/api\/review\/([a-zA-Z0-9\-]+)$/;

// Simple in-memory rate limiter for refresh requests (per-worker instance)
const refreshCooldowns = new Map<string, number>();
const REFRESH_COOLDOWN_MS = 60_000; // 1 minute between refreshes per username

function mapErrorStatus(message: string): number {
  if (message === 'User not found') return 404;
  if (message === 'No review activity found') return 422;
  if (message.includes('rate limit')) return 429;
  return 500;
}

function mapErrorCode(message: string): string {
  if (message === 'User not found') return 'USER_NOT_FOUND';
  if (message === 'No review activity found') return 'NO_REVIEW_ACTIVITY';
  if (message.includes('rate limit')) return 'RATE_LIMITED';
  return 'INTERNAL_ERROR';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API route: /api/review/:username
    const match = url.pathname.match(API_REVIEW_PATTERN);
    if (match) {
      const username = match[1];
      const forceRefresh = url.searchParams.get('refresh') === 'true';

      // Rate-limit refresh requests
      if (forceRefresh) {
        const key = username.toLowerCase();
        const lastRefresh = refreshCooldowns.get(key) ?? 0;
        if (Date.now() - lastRefresh < REFRESH_COOLDOWN_MS) {
          return new Response(
            JSON.stringify({ error: 'Refresh rate limited — try again later', code: 'REFRESH_RATE_LIMITED' }),
            { status: 429, headers: { 'Content-Type': 'application/json' } },
          );
        }
        refreshCooldowns.set(key, Date.now());
      }

      try {
        const result = await handleReviewRequest(
          username,
          forceRefresh,
          env.REVIEWER_CACHE,
          env.GEMINI_API_KEY,
          env.GITHUB_TOKEN,
        );
        return new Response(JSON.stringify(result), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
          JSON.stringify({ error: message, code: mapErrorCode(message) }),
          {
            status: mapErrorStatus(message),
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
    }

    const angularResponse = await angularApp.handle(request);
    if (angularResponse) {
      return angularResponse;
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
