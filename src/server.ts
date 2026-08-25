import { AngularAppEngine } from '@angular/ssr';
import { handleReviewRequest } from './server/review-handler';
import { ReviewAnalysisResponse } from './app/models/reviewer.model';

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  REVIEWER_CACHE: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  };
  GEMINI_API_KEY: string;
  GITHUB_TOKEN?: string;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const angularApp = new AngularAppEngine();

const API_REVIEW_PATTERN = /^\/api\/review\/([a-zA-Z0-9\-]+)$/;
const API_OG_PATTERN = /^\/api\/og(?:\/([a-zA-Z0-9\-]+))?$/;
const REVIEWER_PAGE_PATTERN = /^\/reviewer\/([a-zA-Z0-9\-]+)$/;
const BASE_URL = 'https://mergeconflicted.santosh-yadav198613.workers.dev';

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

    // OG image route: /api/og or /api/og/:username
    const ogMatch = url.pathname.match(API_OG_PATTERN);
    if (ogMatch) {
      try {
        const username = ogMatch[1];
        let ogData: { username: string; archetype: string; emoji: string; tagline: string; avatarUrl: string } | undefined;

        if (username) {
          // Try to load cached reviewer data for a personalized image
          try {
            const cached = await env.REVIEWER_CACHE.get(`reviewer:${username.toLowerCase()}`);
            if (cached) {
              const result = JSON.parse(cached) as ReviewAnalysisResponse;
              ogData = {
                username: result.profile.login,
                archetype: result.personality.archetype,
                emoji: result.personality.emoji,
                tagline: result.personality.tagline,
                avatarUrl: result.profile.avatarUrl,
              };
            }
          } catch {
            // Cache miss or parse error — fall through to default image
          }
        }

        const { generateOgImage } = await import('./server/og-image');
        const png = await generateOgImage(ogData);
        return new Response(png as unknown as BodyInit, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          },
        });
      } catch (ogError) {
        const message = ogError instanceof Error ? ogError.stack ?? ogError.message : 'Unknown error';
        console.error('OG image generation failed:', message);
        return new Response(`OG image generation failed: ${message}`, { status: 500 });
      }
    }

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

    // For reviewer pages, inject personalized OG meta tags into the SSR HTML
    const reviewerMatch = url.pathname.match(REVIEWER_PAGE_PATTERN);
    if (reviewerMatch) {
      const username = reviewerMatch[1];
      const angularResponse = await angularApp.handle(request);
      if (angularResponse) {
        let ogMeta: { title: string; description: string; url: string; image: string; imageAlt: string } | undefined;
        try {
          const cached = await env.REVIEWER_CACHE.get(`reviewer:${username.toLowerCase()}`);
          if (cached) {
            const result = JSON.parse(cached) as ReviewAnalysisResponse;
            const { personality, profile } = result;
            ogMeta = {
              title: `${profile.login} is "${personality.archetype}" ${personality.emoji} — MergeConflicted`,
              description: `${personality.tagline} — ${personality.description}`,
              url: `${BASE_URL}/reviewer/${profile.login}`,
              image: `${BASE_URL}/api/og/${profile.login}`,
              imageAlt: `${profile.login}'s code review personality: ${personality.archetype}`,
            };
          }
        } catch {
          // Cache miss — use defaults
        }

        if (ogMeta) {
          const html = await angularResponse.text();
          const updated = html
            .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeAttr(ogMeta.title)}">`)
            .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeAttr(ogMeta.description)}">`)
            .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${escapeAttr(ogMeta.url)}">`)
            .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${escapeAttr(ogMeta.image)}">`)
            .replace(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${escapeAttr(ogMeta.imageAlt)}">`)
            .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeAttr(ogMeta.title)}">`)
            .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeAttr(ogMeta.description)}">`)
            .replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${escapeAttr(ogMeta.image)}">`)
            .replace(/<meta name="twitter:image:alt" content="[^"]*">/, `<meta name="twitter:image:alt" content="${escapeAttr(ogMeta.imageAlt)}">`)
            .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(ogMeta.title)}</title>`);

          return new Response(updated, {
            status: angularResponse.status,
            headers: angularResponse.headers,
          });
        }
        return angularResponse;
      }
    }

    const angularResponse = await angularApp.handle(request);
    if (angularResponse) {
      return angularResponse;
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
