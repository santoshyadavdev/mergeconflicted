# Reviewer Personality — Design Spec

## Overview

A fun, lighthearted web feature for the "mergeconflicted" app that classifies GitHub users into code reviewer personality archetypes based on their public review activity. Users enter a GitHub username, the app fetches public review data, sends aggregated stats to Google Gemini, and presents a shareable personality profile page.

## Goals

- Entertaining and shareable — users want to discover and share their reviewer type
- Zero friction — no login, no auth, just enter a username
- Fast repeat visits — cached results load instantly
- Social-ready — shareable links with proper OG meta tags for rich previews

## Non-Goals

- Private repo analysis (requires OAuth — out of scope)
- Team analytics or dashboards
- Accuracy guarantees — this is entertainment, not performance review

## Architecture

### Approach: Hybrid (SSR + Client-Driven)

The interactive input flow is client-driven for a snappy UX with loading animations. Shareable URLs (`/reviewer/:username`) are fully server-side rendered with social meta tags for link previews.

### Data Flow

```
User enters username
  → Angular app GETs /api/review/:username
  → Cloudflare Worker checks KV cache
    → Cache hit: return cached result
    → Cache miss:
      → Fetch GitHub public API (events, search)
      → Aggregate raw stats
      → Send stats + prompt to Google Gemini
      → Store result in KV (24h TTL)
      → Return result
  → Angular renders result page with animations

Shareable URL /reviewer/:username
  → Cloudflare Worker SSR
  → Renders full HTML with OG meta tags
  → Client hydrates for interactivity
```

### Components

1. **Angular Frontend** — Input page, loading page, result/profile page
2. **Cloudflare Worker API** — `/api/review/:username` endpoint
3. **GitHub Service** — Fetches public events, reviews, PR comments
4. **Gemini Service** — Sends aggregated stats, returns personality archetype
5. **Cloudflare KV** — Caches results per username (24h TTL)
6. **SSR Route** — `/reviewer/:username` with social meta tags

## GitHub Data Collection

### Endpoints Used (Unauthenticated)

| Endpoint | Data Points |
|----------|-------------|
| `GET /users/:username` | Avatar, name, bio, public repos count |
| `GET /users/:username/events/public` | Recent activity — PullRequestReviewEvent, PullRequestReviewCommentEvent, IssueCommentEvent |
| `GET /search/issues?q=reviewed-by:username+type:pr` | Total PRs reviewed |

### Aggregated Stats Sent to Gemini

- Total PRs reviewed (approximate from search)
- Approval vs changes-requested vs comment-only ratio
- Average comment length
- Review frequency patterns (day of week, time of day)
- Types of repos reviewed (languages, sizes)
- How quickly they review after PR is opened
- Total review comments count

### Rate Limits

GitHub unauthenticated API: 60 requests/hour per IP. With KV caching (24h TTL), this handles moderate traffic. For higher traffic, an optional `GITHUB_TOKEN` Worker secret can be added to increase the limit to 5,000/hour.

## Gemini AI Integration

### SDK

`@google/genai` — Google's official Gemini SDK for JavaScript/TypeScript.

### API Key

Stored as a Cloudflare Workers environment secret (`GEMINI_API_KEY`). All Gemini calls happen server-side only.

### Prompt Design

The prompt sends aggregated GitHub stats and instructs Gemini to return a structured JSON response:

```
You are a fun, witty personality analyzer for code reviewers on GitHub.
Given these GitHub review stats for user "{username}":
{aggregated stats JSON}

Classify them into a reviewer archetype. Be creative, funny, and insightful.
Return valid JSON with this structure:
{
  "archetype": "string — the personality name (e.g., The Nitpicker)",
  "emoji": "string — a single emoji representing the archetype",
  "tagline": "string — a witty one-liner catchphrase",
  "description": "string — 2-3 sentence personality description",
  "strengths": ["string array — 3 key strengths"],
  "funFacts": ["string array — 2-3 fun observations from their data"],
  "reviewStyle": "string — brief description of their review approach",
  "stats": {
    "reviewsAnalyzed": number,
    "approvalRate": "string percentage",
    "avgCommentLength": number,
    "mostActiveDay": "string"
  }
}
```

### Example Archetypes

Gemini is free to create archetypes beyond this list, but these serve as inspiration:

- 🔍 **The Nitpicker** — finds every missing semicolon
- ✅ **The Rubber Stamper** — LGTM is their catchphrase
- 🎓 **The Mentor** — writes essays in review comments
- 👻 **The Ghost** — assigned but never seen
- ⚡ **The Speed Demon** — reviews in under 5 minutes
- 🏗️ **The Architect** — only cares about the big picture
- 🐛 **The Bug Hunter** — finds bugs nobody else sees

## Pages & Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Client | Home page with username input |
| `/reviewer/:username` | SSR + Client | Result/profile page (SSR for meta tags, hydrated for interactivity) |
| `/api/review/:username` | API | Worker endpoint returning personality JSON |

## UI Design

### Page 1: Home / Input

- Hero section with app title: "What kind of reviewer are you?"
- Subtitle: "Enter a GitHub username to discover your code review personality"
- Username input field + "Discover" button
- Footer note: "We analyze public review activity only"

### Page 2: Loading / Analysis

- Animated brain emoji
- Username being analyzed: "Analyzing @octocat's reviews..."
- Step-by-step progress indicators:
  - ✓ Fetching GitHub activity
  - ✓ Analyzing review patterns
  - ⟳ Generating personality...
- Displayed client-side while the API call is in progress

### Page 3: Result / Profile

- **Hero card** — dark gradient background with archetype emoji, name, tagline, and user avatar
- **Stats row** — 3 key metrics (reviews count, approval rate, avg comment length)
- **Strengths section** — green-tinted card with 3 bullet points
- **Fun Facts section** — amber-tinted card with 2-3 observations
- **Share buttons** — Copy Link, Share on X, Share on LinkedIn
- **Try Another** — link back to home page

### Social Sharing

When `/reviewer/:username` is shared on social media, the SSR'd page includes:

```html
<meta property="og:title" content="@octocat is The Nitpicker 🔍">
<meta property="og:description" content="No detail escapes my review — Discover your reviewer personality!">
<meta property="og:url" content="https://mergeconflicted.dev/reviewer/octocat">
<meta name="twitter:card" content="summary_large_image">
```

OG image generation is a stretch goal (not in initial scope). The initial version uses text-based social cards.

## Caching Strategy

- **Storage:** Cloudflare KV
- **Key format:** `reviewer:{username}`
- **Value:** Full Gemini result JSON
- **TTL:** 24 hours
- **Cache hit:** Skip GitHub + Gemini calls, return cached result immediately
- **Force refresh:** Optional "Refresh" button on result page bypasses cache

## Error Handling

| Scenario | User-Facing Behavior |
|----------|---------------------|
| Username not found (GitHub 404) | Friendly "User not found" message with suggestion to check spelling |
| No review activity found | "No reviews found — try a more active reviewer!" with link to try another |
| GitHub API rate limited (403) | "GitHub is busy — please try again in a few minutes" |
| Gemini API error | Retry once; on second failure show "Couldn't generate personality — try again later" |
| Gemini returns invalid JSON | Retry with stricter prompt; fallback to generic error |
| KV unavailable | Skip cache gracefully, fetch fresh data |
| Network timeout | Show timeout message with retry button |

## Project Structure

```
src/app/
  pages/
    home/                   → Home page with username input
      home.ts
    reviewer/               → Result/profile page
      reviewer.ts
  services/
    github.service.ts       → GitHub API client (used server-side via API route)
    review.service.ts       → Orchestrates API call to /api/review/:username
  models/
    reviewer.model.ts       → TypeScript interfaces (ReviewerPersonality, GitHubStats, etc.)
  components/
    personality-card/       → Hero card with archetype display
      personality-card.ts
    share-buttons/          → Social share buttons (Copy Link, X, LinkedIn)
      share-buttons.ts
    loading-steps/          → Animated loading progress indicator
      loading-steps.ts

src/
  server.ts                 → Cloudflare Worker entry, handles /api/* routes + SSR
  main.ts                   → Angular client bootstrap
  main.server.ts            → Angular SSR bootstrap
```

## TypeScript Interfaces

```typescript
interface ReviewerPersonality {
  archetype: string;
  emoji: string;
  tagline: string;
  description: string;
  strengths: string[];
  funFacts: string[];
  reviewStyle: string;
  stats: ReviewStats;
}

interface ReviewStats {
  reviewsAnalyzed: number;
  approvalRate: string;
  avgCommentLength: number;
  mostActiveDay: string;
}

interface GitHubUserProfile {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  publicRepos: number;
}

interface ReviewAnalysisRequest {
  username: string;
  forceRefresh?: boolean;
}

interface ReviewAnalysisResponse {
  personality: ReviewerPersonality;
  profile: GitHubUserProfile;
  cachedAt: string | null;
}
```

## Testing Strategy

- **Unit tests (Vitest):** Services (GitHub data aggregation, Gemini prompt construction), components (rendering with mock data)
- **Mock Gemini responses:** Test with fixture JSON to verify UI rendering without API calls
- **Mock GitHub responses:** Test data aggregation logic with fixture event data
- **Error scenarios:** Test each error case renders the correct user-facing message

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 22 (standalone components, signals) |
| Styling | Tailwind CSS 4 |
| Server | Cloudflare Workers (SSR + API) |
| AI | Google Gemini via `@google/genai` SDK |
| Cache | Cloudflare KV |
| Testing | Vitest |
| Package Manager | pnpm |

## Out of Scope (Future Enhancements)

- GitHub OAuth for private repo analysis
- Dynamic OG image generation (e.g., via Cloudflare Workers + canvas)
- Comparison mode ("Who's the better reviewer?")
- Leaderboards or community features
- Historical tracking (how personality changes over time)
