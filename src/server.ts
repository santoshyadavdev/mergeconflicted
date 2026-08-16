import { AngularAppEngine } from '@angular/ssr';
import { handleReviewRequest } from './server/review-handler';

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  REVIEWER_CACHE: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  };
  GEMINI_API_KEY: string;
}

const angularApp = new AngularAppEngine();

const API_REVIEW_PATTERN = /^\/api\/review\/([a-zA-Z0-9\-]+)$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API route: /api/review/:username
    const match = url.pathname.match(API_REVIEW_PATTERN);
    if (match) {
      const username = match[1];
      const forceRefresh = url.searchParams.get('refresh') === 'true';

      try {
        const result = await handleReviewRequest(
          username,
          forceRefresh,
          env.REVIEWER_CACHE,
          env.GEMINI_API_KEY,
        );
        return new Response(JSON.stringify(result), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const status = message === 'User not found' ? 404 : message === 'No review activity found' ? 404 : 500;
        return new Response(JSON.stringify({ error: message }), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const angularResponse = await angularApp.handle(request);
    if (angularResponse) {
      return angularResponse;
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
