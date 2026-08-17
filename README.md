# MergeConflicted

Discover your code reviewer personality. Enter a GitHub username, and the app analyses that
user's public review activity and asks Gemini to classify them into a reviewer archetype —
The Nitpicker, The Mentor, The Rubber Stamper, and whatever else the model invents.

Live at <https://mergeconflicted.santosh-yadav198613.workers.dev>

## How it works

1. `GET /api/review/:username` hits the Cloudflare Worker.
2. The Worker checks the `REVIEWER_CACHE` KV namespace (24h TTL).
3. On a miss, it pulls the user's public events from the GitHub API and aggregates review
   stats — approvals, changes requested, comment lengths, most active day.
4. Those stats go to Gemini, which returns the archetype as JSON.
5. The result is cached and rendered. `/reviewer/:username` is server-rendered, so shared
   links preview correctly.

## Tech stack

- **Angular 22** — standalone components, signals, `httpResource` for data fetching
- **Angular SSR** (`@angular/ssr`) — home page prerendered, reviewer pages server-rendered
- **Cloudflare Workers** — hosts the API, SSR, and static assets
- **Workers KV** — response cache
- **Gemini** (`@google/genai`) — personality classification
- **Tailwind CSS v4** and **Vitest**

## Project structure

```
src/
  server.ts               Worker entry — /api routes, SSR, static asset fallback
  server/
    github.ts             GitHub API fetching and stat aggregation
    gemini.ts             Prompt construction and response parsing
    review-handler.ts     Orchestration and KV caching
  app/
    pages/home            Username entry form
    pages/reviewer        Result page (SSR)
    components/           personality-card, share-buttons, loading-steps
    services/             review.service.ts — httpResource wrapper for the API
cloudflare/
  xhr2-stub.mjs           Bundler stub, see "Cloudflare notes"
```

## Getting started

Requires Node.js 20+ and pnpm.

```bash
pnpm install
```

### Local development

```bash
pnpm preview   # ng build + wrangler dev  →  http://localhost:8788
```

Use this for anything that touches the API. `pnpm start` (`ng serve`) is faster for pure UI
work with hot reload, but **`/api/*` returns 404 there** — the Angular dev server does not
recognise the Worker's `export default { fetch }` handler and falls back to its own SSR
middleware, so the Worker routes never run.

For local secrets, create `.dev.vars` (git-ignored):

```
GEMINI_API_KEY=your-key
GITHUB_TOKEN=your-pat
```

`GEMINI_API_KEY` is required. `GITHUB_TOKEN` is optional but recommended — unauthenticated
GitHub API requests are rate limited to 60/hour.

### Tests

```bash
pnpm test
```

Note that `angular.json` excludes `src/server/**` from the test target, so the specs for
`github.ts`, `gemini.ts`, and `review-handler.ts` do not currently run.

## Deployment

```bash
pnpm deploy    # ng build + wrangler deploy
```

Secrets are set separately from `.dev.vars`:

```bash
pnpm exec wrangler secret put GEMINI_API_KEY
pnpm exec wrangler secret put GITHUB_TOKEN
```

Bindings live in `wrangler.jsonc`: `ASSETS` for static files and `REVIEWER_CACHE` for the KV
cache.

## API

`GET /api/review/:username`

| Query | Description |
| --- | --- |
| `refresh=true` | Bypass the KV cache. Limited to one refresh per username per minute. |

Errors return `{ error, code }`:

| Status | Code |
| --- | --- |
| 404 | `USER_NOT_FOUND` |
| 422 | `NO_REVIEW_ACTIVITY` |
| 429 | `RATE_LIMITED` / `REFRESH_RATE_LIMITED` |
| 500 | `INTERNAL_ERROR` |

## Cloudflare notes

Three settings exist specifically to make Angular SSR work on workerd. They look removable
but are not:

- **`ssr.platform: "neutral"`** in `angular.json`. Without it the server bundle is built for
  Node and injects `createRequire`, which throws on deploy.
- **`security.allowedHosts`** in `angular.json`. Angular validates the `Host` header as SSRF
  protection, and an empty list rejects every request — including your own domain. New
  deployment hostnames must be added here.
- **`alias.xhr2`** in `wrangler.jsonc`, pointing at `cloudflare/xhr2-stub.mjs`. Angular's
  HttpClient has a dead-code `import('xhr2')` fallback that Wrangler still has to resolve at
  bundle time. The stub satisfies the bundler and keeps the Node-only library out of the
  Worker.

`@google/genai` is imported via its `/web` entry point for the same reason — the package's
default export condition is a shim that throws outside Node or a browser.

