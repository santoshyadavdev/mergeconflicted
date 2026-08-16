# Reviewer Personality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fun web feature where users enter a GitHub username and get a shareable reviewer personality archetype powered by Google Gemini.

**Architecture:** Hybrid SSR + client-driven Angular 22 app on Cloudflare Workers. Client handles the interactive input/loading flow; the Worker API fetches GitHub data, calls Gemini, caches in KV, and returns personality JSON. Shareable URLs are SSR'd with OG meta tags.

**Tech Stack:** Angular 22, Tailwind CSS 4, Cloudflare Workers + KV, Google Gemini (`@google/genai`), Vitest

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `src/app/models/reviewer.model.ts` | TypeScript interfaces for ReviewerPersonality, ReviewStats, GitHubUserProfile, ReviewAnalysisResponse |
| `src/app/services/review.service.ts` | Client-side service that calls `/api/review/:username` |
| `src/app/services/review.service.spec.ts` | Tests for ReviewService |
| `src/app/pages/home/home.ts` | Home page component with username input |
| `src/app/pages/home/home.spec.ts` | Tests for HomePage |
| `src/app/pages/reviewer/reviewer.ts` | Result/profile page component |
| `src/app/pages/reviewer/reviewer.spec.ts` | Tests for ReviewerPage |
| `src/app/components/personality-card/personality-card.ts` | Hero card displaying archetype |
| `src/app/components/personality-card/personality-card.spec.ts` | Tests for PersonalityCard |
| `src/app/components/share-buttons/share-buttons.ts` | Social share buttons (Copy Link, X, LinkedIn) |
| `src/app/components/share-buttons/share-buttons.spec.ts` | Tests for ShareButtons |
| `src/app/components/loading-steps/loading-steps.ts` | Animated loading progress indicator |
| `src/app/components/loading-steps/loading-steps.spec.ts` | Tests for LoadingSteps |
| `src/server/github.ts` | Server-side GitHub API client (fetches public events, search) |
| `src/server/github.spec.ts` | Tests for GitHub service |
| `src/server/gemini.ts` | Server-side Gemini API client (sends stats, gets personality) |
| `src/server/gemini.spec.ts` | Tests for Gemini service |
| `src/server/review-handler.ts` | Request handler for `/api/review/:username` (orchestrates GitHub → Gemini → KV) |
| `src/server/review-handler.spec.ts` | Tests for review handler |

### Modified Files

| File | Changes |
|------|---------|
| `src/app/app.routes.ts` | Add routes for `/` (home) and `/reviewer/:username` |
| `src/app/app.routes.server.ts` | Configure SSR render modes per route |
| `src/app/app.ts` | Strip placeholder template, keep RouterOutlet only |
| `src/app/app.html` | Replace placeholder with minimal layout |
| `src/app/app.css` | Remove placeholder styles |
| `src/app/app.spec.ts` | Update test to match new app shell |
| `src/server.ts` | Add `/api/review/:username` route, update Env interface for KV + secrets |
| `src/index.html` | Add default OG meta tags |
| `package.json` | Add `@google/genai` dependency |
| `wrangler.jsonc` | Add KV namespace binding |

---

## Task 1: TypeScript Models

**Files:**
- Create: `src/app/models/reviewer.model.ts`

- [ ] **Step 1: Create the models file with all interfaces**

```typescript
// src/app/models/reviewer.model.ts

export interface ReviewStats {
  reviewsAnalyzed: number;
  approvalRate: string;
  avgCommentLength: number;
  mostActiveDay: string;
}

export interface ReviewerPersonality {
  archetype: string;
  emoji: string;
  tagline: string;
  description: string;
  strengths: string[];
  funFacts: string[];
  reviewStyle: string;
  stats: ReviewStats;
}

export interface GitHubUserProfile {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  publicRepos: number;
}

export interface ReviewAnalysisResponse {
  personality: ReviewerPersonality;
  profile: GitHubUserProfile;
  cachedAt: string | null;
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | head -20`
Expected: No errors related to `reviewer.model.ts`

- [ ] **Step 3: Commit**

```bash
git add src/app/models/reviewer.model.ts
git commit -m "feat: add TypeScript interfaces for reviewer personality models"
```

---

## Task 2: Clean Up App Shell

**Files:**
- Modify: `src/app/app.ts`
- Modify: `src/app/app.html`
- Modify: `src/app/app.css`
- Modify: `src/app/app.spec.ts`
- Modify: `src/index.html`

- [ ] **Step 1: Replace app.html with minimal layout**

Replace the entire content of `src/app/app.html` with:

```html
<main class="min-h-dvh bg-gray-950 text-white">
  <router-outlet />
</main>
```

- [ ] **Step 2: Clear app.css**

Replace the entire content of `src/app/app.css` with an empty file (no styles needed — Tailwind handles everything).

- [ ] **Step 3: Simplify app.ts**

Replace `src/app/app.ts` with:

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
```

- [ ] **Step 4: Update app.spec.ts**

Replace `src/app/app.spec.ts` with:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
```

- [ ] **Step 5: Add default OG meta tags to index.html**

Replace `src/index.html` with:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>MergeConflicted — What Kind of Reviewer Are You?</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Discover your code review personality based on your GitHub activity">
  <meta property="og:title" content="MergeConflicted — What Kind of Reviewer Are You?">
  <meta property="og:description" content="Discover your code review personality based on your GitHub activity">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

- [ ] **Step 6: Run tests**

Run: `npx ng test --watch=false 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/app/app.ts src/app/app.html src/app/app.css src/app/app.spec.ts src/index.html
git commit -m "refactor: clean up app shell, add default OG meta tags"
```

---

## Task 3: Loading Steps Component

**Files:**
- Create: `src/app/components/loading-steps/loading-steps.ts`
- Create: `src/app/components/loading-steps/loading-steps.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/components/loading-steps/loading-steps.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { LoadingSteps } from './loading-steps';

describe('LoadingSteps', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSteps],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(LoadingSteps);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the username being analyzed', async () => {
    const fixture = TestBed.createComponent(LoadingSteps);
    fixture.componentRef.setInput('username', 'octocat');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('@octocat');
  });

  it('should render three loading steps', async () => {
    const fixture = TestBed.createComponent(LoadingSteps);
    fixture.componentRef.setInput('username', 'octocat');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const steps = el.querySelectorAll('[data-testid="loading-step"]');
    expect(steps.length).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | tail -20`
Expected: FAIL — LoadingSteps not found

- [ ] **Step 3: Implement the component**

Create `src/app/components/loading-steps/loading-steps.ts`:

```typescript
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-steps',
  template: `
    <div class="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div class="text-6xl animate-pulse" aria-hidden="true">🧠</div>
      <h2 class="text-2xl font-semibold">
        Analyzing <span class="text-purple-400">{{'@' + username()}}</span>'s reviews...
      </h2>
      <p class="text-gray-400">Our AI is reading through your review history</p>
      <div class="flex flex-col gap-3 mt-4" role="status" aria-label="Analysis progress">
        @for (step of steps; track step.label) {
          <div class="flex items-center gap-3" data-testid="loading-step">
            <span [class]="step.done ? 'text-green-400' : 'text-yellow-400 animate-spin'">
              {{ step.done ? '✓' : '⟳' }}
            </span>
            <span [class]="step.done ? 'text-gray-400' : 'text-white'">
              {{ step.label }}
            </span>
          </div>
        }
      </div>
    </div>
  `,
})
export class LoadingSteps {
  readonly username = input.required<string>();

  protected readonly steps = [
    { label: 'Fetching GitHub activity', done: true },
    { label: 'Analyzing review patterns', done: true },
    { label: 'Generating personality...', done: false },
  ];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/components/loading-steps/
git commit -m "feat: add LoadingSteps component with animated progress"
```

---

## Task 4: Personality Card Component

**Files:**
- Create: `src/app/components/personality-card/personality-card.ts`
- Create: `src/app/components/personality-card/personality-card.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/components/personality-card/personality-card.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { PersonalityCard } from './personality-card';
import { ReviewerPersonality, GitHubUserProfile } from '../../models/reviewer.model';

const mockPersonality: ReviewerPersonality = {
  archetype: 'The Nitpicker',
  emoji: '🔍',
  tagline: 'No detail escapes my review',
  description: 'You examine every line with surgical precision.',
  strengths: ['Thorough analysis', 'Catches edge cases', 'Consistent standards'],
  funFacts: ['Reviews most on Tuesdays', 'Favorite word: "nit"'],
  reviewStyle: 'Meticulous and detail-oriented',
  stats: {
    reviewsAnalyzed: 142,
    approvalRate: '34%',
    avgCommentLength: 280,
    mostActiveDay: 'Tuesday',
  },
};

const mockProfile: GitHubUserProfile = {
  login: 'octocat',
  name: 'The Octocat',
  avatarUrl: 'https://github.com/octocat.png',
  bio: 'GitHub mascot',
  publicRepos: 8,
};

describe('PersonalityCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonalityCard],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PersonalityCard);
    fixture.componentRef.setInput('personality', mockPersonality);
    fixture.componentRef.setInput('profile', mockProfile);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the archetype name', async () => {
    const fixture = TestBed.createComponent(PersonalityCard);
    fixture.componentRef.setInput('personality', mockPersonality);
    fixture.componentRef.setInput('profile', mockProfile);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('The Nitpicker');
  });

  it('should display the emoji', async () => {
    const fixture = TestBed.createComponent(PersonalityCard);
    fixture.componentRef.setInput('personality', mockPersonality);
    fixture.componentRef.setInput('profile', mockProfile);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('🔍');
  });

  it('should display the tagline', async () => {
    const fixture = TestBed.createComponent(PersonalityCard);
    fixture.componentRef.setInput('personality', mockPersonality);
    fixture.componentRef.setInput('profile', mockProfile);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No detail escapes my review');
  });

  it('should display the username', async () => {
    const fixture = TestBed.createComponent(PersonalityCard);
    fixture.componentRef.setInput('personality', mockPersonality);
    fixture.componentRef.setInput('profile', mockProfile);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('@octocat');
  });

  it('should display stats', async () => {
    const fixture = TestBed.createComponent(PersonalityCard);
    fixture.componentRef.setInput('personality', mockPersonality);
    fixture.componentRef.setInput('profile', mockProfile);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('142');
    expect(el.textContent).toContain('34%');
  });

  it('should display strengths', async () => {
    const fixture = TestBed.createComponent(PersonalityCard);
    fixture.componentRef.setInput('personality', mockPersonality);
    fixture.componentRef.setInput('profile', mockProfile);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Thorough analysis');
  });

  it('should display fun facts', async () => {
    const fixture = TestBed.createComponent(PersonalityCard);
    fixture.componentRef.setInput('personality', mockPersonality);
    fixture.componentRef.setInput('profile', mockProfile);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Reviews most on Tuesdays');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | tail -20`
Expected: FAIL — PersonalityCard not found

- [ ] **Step 3: Implement the component**

Create `src/app/components/personality-card/personality-card.ts`:

```typescript
import { Component, input } from '@angular/core';
import { ReviewerPersonality, GitHubUserProfile } from '../../models/reviewer.model';

@Component({
  selector: 'app-personality-card',
  template: `
    <!-- Hero Card -->
    <div class="text-center p-8 bg-gradient-to-br from-gray-900 to-indigo-950 rounded-2xl mb-6">
      <div class="text-6xl mb-2" aria-hidden="true">{{ personality().emoji }}</div>
      <h1 class="text-3xl font-bold text-white mb-1">{{ personality().archetype }}</h1>
      <p class="text-gray-400 italic">"{{ personality().tagline }}"</p>
      <div class="flex items-center justify-center gap-2 mt-4">
        <img
          [src]="profile().avatarUrl"
          [alt]="'Avatar of ' + profile().login"
          class="w-8 h-8 rounded-full border-2 border-green-400"
          width="32"
          height="32"
        />
        <span class="text-gray-400">{{'@' + profile().login}}</span>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="grid grid-cols-3 gap-3 mb-6">
      @for (stat of statsDisplay(); track stat.label) {
        <div class="text-center p-4 bg-gray-800 rounded-xl">
          <div class="text-2xl font-bold text-white">{{ stat.value }}</div>
          <div class="text-xs text-gray-400 mt-1">{{ stat.label }}</div>
        </div>
      }
    </div>

    <!-- Strengths & Fun Facts -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
      <div class="p-5 bg-green-950/40 border border-green-900/50 rounded-xl">
        <h3 class="font-semibold text-sm mb-3 text-green-400">💪 Strengths</h3>
        <ul class="space-y-1 text-sm text-gray-300">
          @for (s of personality().strengths; track s) {
            <li>• {{ s }}</li>
          }
        </ul>
      </div>
      <div class="p-5 bg-amber-950/40 border border-amber-900/50 rounded-xl">
        <h3 class="font-semibold text-sm mb-3 text-amber-400">🎲 Fun Facts</h3>
        <ul class="space-y-1 text-sm text-gray-300">
          @for (f of personality().funFacts; track f) {
            <li>• {{ f }}</li>
          }
        </ul>
      </div>
    </div>

    <!-- Review Style -->
    <div class="p-5 bg-gray-800 rounded-xl mb-6">
      <h3 class="font-semibold text-sm mb-2 text-purple-400">🎯 Review Style</h3>
      <p class="text-sm text-gray-300">{{ personality().reviewStyle }}</p>
    </div>

    <!-- Description -->
    <div class="p-5 bg-gray-800 rounded-xl">
      <h3 class="font-semibold text-sm mb-2 text-blue-400">📝 About This Reviewer</h3>
      <p class="text-sm text-gray-300">{{ personality().description }}</p>
    </div>
  `,
})
export class PersonalityCard {
  readonly personality = input.required<ReviewerPersonality>();
  readonly profile = input.required<GitHubUserProfile>();

  protected readonly statsDisplay = () => [
    { value: String(this.personality().stats.reviewsAnalyzed), label: 'Reviews' },
    { value: this.personality().stats.approvalRate, label: 'Approval Rate' },
    { value: String(this.personality().stats.avgCommentLength), label: 'Avg Comment Len' },
  ];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/components/personality-card/
git commit -m "feat: add PersonalityCard component with stats and details"
```

---

## Task 5: Share Buttons Component

**Files:**
- Create: `src/app/components/share-buttons/share-buttons.ts`
- Create: `src/app/components/share-buttons/share-buttons.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/components/share-buttons/share-buttons.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { ShareButtons } from './share-buttons';

describe('ShareButtons', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareButtons],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ShareButtons);
    fixture.componentRef.setInput('username', 'octocat');
    fixture.componentRef.setInput('archetype', 'The Nitpicker');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render copy link button', async () => {
    const fixture = TestBed.createComponent(ShareButtons);
    fixture.componentRef.setInput('username', 'octocat');
    fixture.componentRef.setInput('archetype', 'The Nitpicker');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const copyBtn = el.querySelector('[data-testid="copy-link"]');
    expect(copyBtn).toBeTruthy();
  });

  it('should render X share link', async () => {
    const fixture = TestBed.createComponent(ShareButtons);
    fixture.componentRef.setInput('username', 'octocat');
    fixture.componentRef.setInput('archetype', 'The Nitpicker');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const xLink = el.querySelector('[data-testid="share-x"]') as HTMLAnchorElement;
    expect(xLink).toBeTruthy();
    expect(xLink.href).toContain('x.com/intent');
  });

  it('should render LinkedIn share link', async () => {
    const fixture = TestBed.createComponent(ShareButtons);
    fixture.componentRef.setInput('username', 'octocat');
    fixture.componentRef.setInput('archetype', 'The Nitpicker');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const liLink = el.querySelector('[data-testid="share-linkedin"]') as HTMLAnchorElement;
    expect(liLink).toBeTruthy();
    expect(liLink.href).toContain('linkedin.com');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | tail -20`
Expected: FAIL — ShareButtons not found

- [ ] **Step 3: Implement the component**

Create `src/app/components/share-buttons/share-buttons.ts`:

```typescript
import { Component, computed, inject, input, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-share-buttons',
  template: `
    <div class="flex flex-wrap gap-3 justify-center">
      <button
        data-testid="copy-link"
        (click)="copyLink()"
        class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        [attr.aria-label]="'Copy link to ' + username() + ' reviewer profile'"
      >
        {{ copied() ? '✓ Copied!' : '🔗 Copy Link' }}
      </button>
      <a
        data-testid="share-x"
        [href]="xShareUrl()"
        target="_blank"
        rel="noopener noreferrer"
        class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors no-underline text-white"
        aria-label="Share on X"
      >
        𝕏 Share
      </a>
      <a
        data-testid="share-linkedin"
        [href]="linkedInShareUrl()"
        target="_blank"
        rel="noopener noreferrer"
        class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors no-underline text-white"
        aria-label="Share on LinkedIn"
      >
        in Share
      </a>
    </div>
  `,
})
export class ShareButtons {
  readonly username = input.required<string>();
  readonly archetype = input.required<string>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  protected readonly copied = signal(false);

  protected readonly profileUrl = computed(() => {
    const origin = isPlatformBrowser(this.platformId)
      ? this.document.location.origin
      : 'https://mergeconflicted.dev';
    return `${origin}/reviewer/${this.username()}`;
  });

  protected readonly xShareUrl = computed(() => {
    const text = `I'm "${this.archetype()}" on MergeConflicted! Discover your code reviewer personality:`;
    return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(this.profileUrl())}`;
  });

  protected readonly linkedInShareUrl = computed(() => {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(this.profileUrl())}`;
  });

  protected copyLink(): void {
    if (isPlatformBrowser(this.platformId)) {
      navigator.clipboard.writeText(this.profileUrl()).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      });
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/components/share-buttons/
git commit -m "feat: add ShareButtons component with copy link, X, and LinkedIn"
```

---

## Task 6: Review Service (Client-Side)

**Files:**
- Create: `src/app/services/review.service.ts`
- Create: `src/app/services/review.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/services/review.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReviewService } from './review.service';
import { ReviewAnalysisResponse } from '../models/reviewer.model';

const mockResponse: ReviewAnalysisResponse = {
  personality: {
    archetype: 'The Nitpicker',
    emoji: '🔍',
    tagline: 'No detail escapes my review',
    description: 'You examine every line.',
    strengths: ['Thorough'],
    funFacts: ['Reviews on Tuesdays'],
    reviewStyle: 'Meticulous',
    stats: {
      reviewsAnalyzed: 142,
      approvalRate: '34%',
      avgCommentLength: 280,
      mostActiveDay: 'Tuesday',
    },
  },
  profile: {
    login: 'octocat',
    name: 'The Octocat',
    avatarUrl: 'https://github.com/octocat.png',
    bio: null,
    publicRepos: 8,
  },
  cachedAt: null,
};

describe('ReviewService', () => {
  let service: ReviewService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReviewService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch review analysis for a username', () => {
    let result: ReviewAnalysisResponse | undefined;
    service.getReviewerPersonality('octocat').subscribe((r) => (result = r));

    const req = httpTesting.expectOne('/api/review/octocat');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);

    expect(result).toEqual(mockResponse);
  });

  it('should pass forceRefresh query param when true', () => {
    service.getReviewerPersonality('octocat', true).subscribe();

    const req = httpTesting.expectOne('/api/review/octocat?refresh=true');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | tail -20`
Expected: FAIL — ReviewService not found

- [ ] **Step 3: Implement the service**

Create `src/app/services/review.service.ts`:

```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReviewAnalysisResponse } from '../models/reviewer.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

  getReviewerPersonality(
    username: string,
    forceRefresh = false,
  ): Observable<ReviewAnalysisResponse> {
    const params = forceRefresh ? '?refresh=true' : '';
    return this.http.get<ReviewAnalysisResponse>(
      `/api/review/${encodeURIComponent(username)}${params}`,
    );
  }
}
```

- [ ] **Step 4: Add HttpClient provider to app config**

In `src/app/app.config.ts`, add `provideHttpClient(withFetch())`:

```typescript
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withFetch()),
  ],
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/app/services/review.service.ts src/app/services/review.service.spec.ts src/app/app.config.ts
git commit -m "feat: add ReviewService client and configure HttpClient"
```

---

## Task 7: Home Page

**Files:**
- Create: `src/app/pages/home/home.ts`
- Create: `src/app/pages/home/home.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/pages/home/home.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HomePage } from './home';

describe('HomePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([{ path: 'reviewer/:username', component: HomePage }])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(HomePage);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have a username input field', async () => {
    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input[data-testid="username-input"]');
    expect(input).toBeTruthy();
  });

  it('should have a discover button', async () => {
    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector('button[data-testid="discover-btn"]');
    expect(button).toBeTruthy();
  });

  it('should navigate to reviewer page on submit', async () => {
    const fixture = TestBed.createComponent(HomePage);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input[data-testid="username-input"]') as HTMLInputElement;
    input.value = 'octocat';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const button = el.querySelector('button[data-testid="discover-btn"]') as HTMLButtonElement;
    button.click();

    expect(navigateSpy).toHaveBeenCalledWith(['/reviewer', 'octocat']);
  });

  it('should not navigate when username is empty', async () => {
    const fixture = TestBed.createComponent(HomePage);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector('button[data-testid="discover-btn"]') as HTMLButtonElement;
    button.click();

    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | tail -20`
Expected: FAIL — HomePage not found

- [ ] **Step 3: Implement the component**

Create `src/app/pages/home/home.ts`:

```typescript
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  imports: [FormsModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-dvh px-4">
      <div class="text-center max-w-lg">
        <div class="text-6xl mb-6" aria-hidden="true">🔍</div>
        <h1 class="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          What kind of reviewer are you?
        </h1>
        <p class="text-gray-400 mb-8 text-lg">
          Enter a GitHub username to discover your code review personality
        </p>
        <form (ngSubmit)="onSubmit()" class="flex gap-3 max-w-md mx-auto">
          <label for="username-input" class="sr-only">GitHub username</label>
          <input
            id="username-input"
            data-testid="username-input"
            type="text"
            [(ngModel)]="username"
            name="username"
            placeholder="github-username"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            class="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            data-testid="discover-btn"
            type="submit"
            class="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Discover
          </button>
        </form>
        <p class="text-gray-600 text-sm mt-4">We analyze public review activity only</p>
      </div>
    </div>
  `,
})
export class HomePage {
  private readonly router = inject(Router);
  protected readonly username = signal('');

  protected onSubmit(): void {
    const trimmed = this.username().trim();
    if (trimmed) {
      this.router.navigate(['/reviewer', trimmed]);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/pages/home/
git commit -m "feat: add HomePage with username input and navigation"
```

---

## Task 8: Reviewer Page

**Files:**
- Create: `src/app/pages/reviewer/reviewer.ts`
- Create: `src/app/pages/reviewer/reviewer.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/pages/reviewer/reviewer.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { ReviewerPage } from './reviewer';
import { ReviewAnalysisResponse } from '../../models/reviewer.model';

const mockResponse: ReviewAnalysisResponse = {
  personality: {
    archetype: 'The Nitpicker',
    emoji: '🔍',
    tagline: 'No detail escapes my review',
    description: 'You examine every line.',
    strengths: ['Thorough'],
    funFacts: ['Reviews on Tuesdays'],
    reviewStyle: 'Meticulous',
    stats: {
      reviewsAnalyzed: 142,
      approvalRate: '34%',
      avgCommentLength: 280,
      mostActiveDay: 'Tuesday',
    },
  },
  profile: {
    login: 'octocat',
    name: 'The Octocat',
    avatarUrl: 'https://github.com/octocat.png',
    bio: null,
    publicRepos: 8,
  },
  cachedAt: null,
};

describe('ReviewerPage', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'reviewer/:username', component: ReviewerPage }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should show loading state initially', async () => {
    const harness = await RouterTestingHarness.create();
    const instance = await harness.navigateByUrl('/reviewer/octocat', ReviewerPage);
    expect(instance).toBeTruthy();

    const el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelector('app-loading-steps')).toBeTruthy();

    httpTesting.expectOne('/api/review/octocat').flush(mockResponse);
  });

  it('should show personality card after loading', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/reviewer/octocat', ReviewerPage);

    httpTesting.expectOne('/api/review/octocat').flush(mockResponse);
    harness.detectChanges();

    const el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelector('app-personality-card')).toBeTruthy();
    expect(el.textContent).toContain('The Nitpicker');
  });

  it('should show error message on failure', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/reviewer/octocat', ReviewerPage);

    httpTesting
      .expectOne('/api/review/octocat')
      .flush({ error: 'User not found' }, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();

    const el = harness.routeNativeElement as HTMLElement;
    expect(el.textContent).toContain('not found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false 2>&1 | tail -20`
Expected: FAIL — ReviewerPage not found

- [ ] **Step 3: Implement the component**

Create `src/app/pages/reviewer/reviewer.ts`:

```typescript
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ReviewService } from '../../services/review.service';
import { ReviewAnalysisResponse } from '../../models/reviewer.model';
import { PersonalityCard } from '../../components/personality-card/personality-card';
import { ShareButtons } from '../../components/share-buttons/share-buttons';
import { LoadingSteps } from '../../components/loading-steps/loading-steps';

interface ReviewerState {
  loading: boolean;
  data: ReviewAnalysisResponse | null;
  error: string | null;
}

@Component({
  selector: 'app-reviewer',
  imports: [PersonalityCard, ShareButtons, LoadingSteps, RouterLink],
  template: `
    @if (state().loading) {
      <app-loading-steps [username]="username()" />
    } @else if (state().error) {
      <div class="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div class="text-6xl" aria-hidden="true">😕</div>
        <h2 class="text-2xl font-semibold text-center">{{ state().error }}</h2>
        <a routerLink="/" class="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-colors no-underline text-white">
          Try Another Username
        </a>
      </div>
    } @else if (state().data; as data) {
      <div class="max-w-2xl mx-auto px-4 py-12">
        <app-personality-card [personality]="data.personality" [profile]="data.profile" />
        <app-share-buttons [username]="data.profile.login" [archetype]="data.personality.archetype" />
        <div class="text-center mt-8">
          <a routerLink="/" class="text-purple-400 hover:text-purple-300 transition-colors">
            ← Try Another Username
          </a>
        </div>
      </div>
    }
  `,
})
export class ReviewerPage {
  private readonly route = inject(ActivatedRoute);
  private readonly reviewService = inject(ReviewService);

  protected readonly username = computed(() => this.route.snapshot.paramMap.get('username') ?? '');

  private readonly result$ = this.route.paramMap.pipe(
    map((params) => params.get('username') ?? ''),
    switchMap((username) =>
      this.reviewService.getReviewerPersonality(username).pipe(
        map((data): ReviewerState => ({ loading: false, data, error: null })),
        catchError((err) => {
          const status = err.status as number;
          let message = "Something went wrong — please try again later";
          if (status === 404) {
            message = `User "${username}" not found — check the spelling and try again`;
          } else if (status === 429) {
            message = "GitHub is busy — please try again in a few minutes";
          }
          return of<ReviewerState>({ loading: false, data: null, error: message });
        }),
      ),
    ),
  );

  private readonly resultSignal = toSignal(this.result$, {
    initialValue: { loading: true, data: null, error: null } as ReviewerState,
  });

  protected readonly state = this.resultSignal;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test --watch=false 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/pages/reviewer/
git commit -m "feat: add ReviewerPage with loading, error, and result states"
```

---

## Task 9: Routes & SSR Configuration

**Files:**
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/app.routes.server.ts`

- [ ] **Step 1: Configure client routes**

Replace `src/app/app.routes.ts` with:

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
  },
  {
    path: 'reviewer/:username',
    loadComponent: () => import('./pages/reviewer/reviewer').then((m) => m.ReviewerPage),
  },
];
```

- [ ] **Step 2: Configure SSR render modes**

Replace `src/app/app.routes.server.ts` with:

```typescript
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'reviewer/:username',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
```

- [ ] **Step 3: Run all tests**

Run: `npx ng test --watch=false 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/app/app.routes.ts src/app/app.routes.server.ts
git commit -m "feat: configure routes with lazy loading and SSR render modes"
```

---

## Task 10: Server-Side GitHub Service

**Files:**
- Create: `src/server/github.ts`
- Create: `src/server/github.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/server/github.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { fetchGitHubStats, GitHubAggregatedStats } from './github';

const mockUserResponse = {
  login: 'octocat',
  name: 'The Octocat',
  avatar_url: 'https://github.com/octocat.png',
  bio: 'GitHub mascot',
  public_repos: 8,
};

const mockEventsResponse = [
  {
    type: 'PullRequestReviewEvent',
    created_at: '2026-08-10T10:00:00Z',
    payload: {
      review: { state: 'approved', body: 'LGTM' },
    },
  },
  {
    type: 'PullRequestReviewEvent',
    created_at: '2026-08-11T14:00:00Z',
    payload: {
      review: { state: 'changes_requested', body: 'Please fix the null check on line 42. This will cause a runtime error when the user object is undefined.' },
    },
  },
  {
    type: 'PullRequestReviewCommentEvent',
    created_at: '2026-08-12T09:00:00Z',
    payload: {
      comment: { body: 'Consider using optional chaining here.' },
    },
  },
];

const mockSearchResponse = {
  total_count: 42,
};

describe('fetchGitHubStats', () => {
  it('should aggregate GitHub data into stats', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(mockUserResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockEventsResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockSearchResponse)));

    const result = await fetchGitHubStats('octocat', mockFetch as unknown as typeof fetch);

    expect(result.profile.login).toBe('octocat');
    expect(result.profile.avatarUrl).toBe('https://github.com/octocat.png');
    expect(result.stats.totalPRsReviewed).toBe(42);
    expect(result.stats.approvedCount).toBe(1);
    expect(result.stats.changesRequestedCount).toBe(1);
    expect(result.stats.commentOnlyCount).toBe(0);
    expect(result.stats.reviewCommentCount).toBe(1);
    expect(result.stats.totalReviewEvents).toBe(2);
  });

  it('should throw on 404', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

    await expect(fetchGitHubStats('nonexistent', mockFetch as unknown as typeof fetch)).rejects.toThrow('User not found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/github.spec.ts 2>&1 | tail -20`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the GitHub service**

Create `src/server/github.ts`:

```typescript
import { GitHubUserProfile } from '../app/models/reviewer.model';

export interface GitHubAggregatedStats {
  totalPRsReviewed: number;
  approvedCount: number;
  changesRequestedCount: number;
  commentOnlyCount: number;
  reviewCommentCount: number;
  totalReviewEvents: number;
  avgCommentLength: number;
  reviewDays: Record<string, number>;
  commentBodies: string[];
}

export interface GitHubFetchResult {
  profile: GitHubUserProfile;
  stats: GitHubAggregatedStats;
}

const GITHUB_API = 'https://api.github.com';
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function fetchGitHubStats(
  username: string,
  fetchFn: typeof fetch = fetch,
): Promise<GitHubFetchResult> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'mergeconflicted-app',
  };

  // Fetch user profile
  const userRes = await fetchFn(`${GITHUB_API}/users/${encodeURIComponent(username)}`, { headers });
  if (userRes.status === 404) {
    throw new Error('User not found');
  }
  if (!userRes.ok) {
    throw new Error(`GitHub API error: ${userRes.status}`);
  }
  const userData = (await userRes.json()) as {
    login: string;
    name: string | null;
    avatar_url: string;
    bio: string | null;
    public_repos: number;
  };

  // Fetch public events
  const eventsRes = await fetchFn(
    `${GITHUB_API}/users/${encodeURIComponent(username)}/events/public?per_page=100`,
    { headers },
  );
  const eventsData = eventsRes.ok
    ? ((await eventsRes.json()) as Array<{
        type: string;
        created_at: string;
        payload: {
          review?: { state: string; body: string };
          comment?: { body: string };
        };
      }>)
    : [];

  // Fetch total PRs reviewed via search
  const searchRes = await fetchFn(
    `${GITHUB_API}/search/issues?q=reviewed-by:${encodeURIComponent(username)}+type:pr&per_page=1`,
    { headers },
  );
  const searchData = searchRes.ok ? ((await searchRes.json()) as { total_count: number }) : { total_count: 0 };

  // Aggregate stats
  let approvedCount = 0;
  let changesRequestedCount = 0;
  let commentOnlyCount = 0;
  let reviewCommentCount = 0;
  const commentBodies: string[] = [];
  const reviewDays: Record<string, number> = {};

  for (const event of eventsData) {
    if (event.type === 'PullRequestReviewEvent' && event.payload.review) {
      const state = event.payload.review.state;
      if (state === 'approved') approvedCount++;
      else if (state === 'changes_requested') changesRequestedCount++;
      else if (state === 'commented') commentOnlyCount++;

      if (event.payload.review.body) {
        commentBodies.push(event.payload.review.body);
      }

      const day = DAY_NAMES[new Date(event.created_at).getUTCDay()];
      reviewDays[day] = (reviewDays[day] ?? 0) + 1;
    } else if (event.type === 'PullRequestReviewCommentEvent' && event.payload.comment) {
      reviewCommentCount++;
      if (event.payload.comment.body) {
        commentBodies.push(event.payload.comment.body);
      }
    }
  }

  const totalCommentLength = commentBodies.reduce((sum, body) => sum + body.length, 0);
  const avgCommentLength = commentBodies.length > 0 ? Math.round(totalCommentLength / commentBodies.length) : 0;

  return {
    profile: {
      login: userData.login,
      name: userData.name,
      avatarUrl: userData.avatar_url,
      bio: userData.bio,
      publicRepos: userData.public_repos,
    },
    stats: {
      totalPRsReviewed: searchData.total_count,
      approvedCount,
      changesRequestedCount,
      commentOnlyCount,
      reviewCommentCount,
      totalReviewEvents: approvedCount + changesRequestedCount + commentOnlyCount,
      avgCommentLength,
      reviewDays,
      commentBodies,
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/server/github.spec.ts 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/server/github.ts src/server/github.spec.ts
git commit -m "feat: add server-side GitHub API service with stats aggregation"
```

---

## Task 11: Server-Side Gemini Service

**Files:**
- Create: `src/server/gemini.ts`
- Create: `src/server/gemini.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/server/gemini.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { generatePersonality } from './gemini';
import { GitHubAggregatedStats } from './github';

const mockStats: GitHubAggregatedStats = {
  totalPRsReviewed: 42,
  approvedCount: 10,
  changesRequestedCount: 25,
  commentOnlyCount: 7,
  reviewCommentCount: 30,
  totalReviewEvents: 42,
  avgCommentLength: 280,
  reviewDays: { Tuesday: 15, Wednesday: 10, Monday: 8 },
  commentBodies: ['Fix this null check', 'Consider using optional chaining'],
};

const mockGeminiResponse = {
  archetype: 'The Nitpicker',
  emoji: '🔍',
  tagline: 'No detail escapes my review',
  description: 'You examine every line with surgical precision.',
  strengths: ['Thorough analysis', 'Catches edge cases', 'Consistent standards'],
  funFacts: ['Reviews most on Tuesdays', 'Favorite word: "nit"'],
  reviewStyle: 'Meticulous and detail-oriented',
  stats: {
    reviewsAnalyzed: 42,
    approvalRate: '24%',
    avgCommentLength: 280,
    mostActiveDay: 'Tuesday',
  },
};

describe('generatePersonality', () => {
  it('should call Gemini and return parsed personality', async () => {
    const mockGenAI = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify(mockGeminiResponse),
        }),
      },
    };

    const result = await generatePersonality('octocat', mockStats, mockGenAI as never);

    expect(result.archetype).toBe('The Nitpicker');
    expect(result.emoji).toBe('🔍');
    expect(result.tagline).toBe('No detail escapes my review');
    expect(result.strengths).toHaveLength(3);
    expect(mockGenAI.models.generateContent).toHaveBeenCalledTimes(1);
  });

  it('should throw on invalid JSON from Gemini', async () => {
    const mockGenAI = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: 'This is not JSON',
        }),
      },
    };

    await expect(generatePersonality('octocat', mockStats, mockGenAI as never)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/gemini.spec.ts 2>&1 | tail -20`
Expected: FAIL — module not found

- [ ] **Step 3: Install the Gemini SDK**

Run: `pnpm add @google/genai`

- [ ] **Step 4: Implement the Gemini service**

Create `src/server/gemini.ts`:

```typescript
import { GoogleGenAI } from '@google/genai';
import { ReviewerPersonality } from '../app/models/reviewer.model';
import { GitHubAggregatedStats } from './github';

function buildPrompt(username: string, stats: GitHubAggregatedStats): string {
  const totalReviews = stats.totalReviewEvents || 1;
  const approvalRate = Math.round((stats.approvedCount / totalReviews) * 100);
  const changesRate = Math.round((stats.changesRequestedCount / totalReviews) * 100);
  const mostActiveDay =
    Object.entries(stats.reviewDays).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'Unknown';

  const statsJson = JSON.stringify(
    {
      username,
      totalPRsReviewed: stats.totalPRsReviewed,
      recentReviewEvents: stats.totalReviewEvents,
      approvalRate: `${approvalRate}%`,
      changesRequestedRate: `${changesRate}%`,
      avgCommentLength: stats.avgCommentLength,
      reviewCommentCount: stats.reviewCommentCount,
      mostActiveDay,
      reviewDayDistribution: stats.reviewDays,
      sampleComments: stats.commentBodies.slice(0, 5),
    },
    null,
    2,
  );

  return `You are a fun, witty personality analyzer for code reviewers on GitHub.
Given these GitHub review stats for user "${username}":
${statsJson}

Classify them into a reviewer archetype. Be creative, funny, and insightful.
Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "archetype": "string — the personality name (e.g., The Nitpicker, The Mentor, The Rubber Stamper)",
  "emoji": "string — a single emoji representing the archetype",
  "tagline": "string — a witty one-liner catchphrase",
  "description": "string — 2-3 sentence personality description",
  "strengths": ["string", "string", "string"],
  "funFacts": ["string", "string"],
  "reviewStyle": "string — brief description of their review approach",
  "stats": {
    "reviewsAnalyzed": ${stats.totalPRsReviewed},
    "approvalRate": "${approvalRate}%",
    "avgCommentLength": ${stats.avgCommentLength},
    "mostActiveDay": "${mostActiveDay}"
  }
}`;
}

function parseGeminiResponse(text: string): ReviewerPersonality {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(cleaned) as ReviewerPersonality;

  // Validate required fields
  if (!parsed.archetype || !parsed.emoji || !parsed.tagline) {
    throw new Error('Invalid personality response: missing required fields');
  }

  return parsed;
}

export async function generatePersonality(
  username: string,
  stats: GitHubAggregatedStats,
  genAI: GoogleGenAI,
): Promise<ReviewerPersonality> {
  const prompt = buildPrompt(username, stats);

  const response = await genAI.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });

  const text = response.text;
  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  return parseGeminiResponse(text);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/server/gemini.spec.ts 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/server/gemini.ts src/server/gemini.spec.ts package.json pnpm-lock.yaml
git commit -m "feat: add server-side Gemini service for personality generation"
```

---

## Task 12: Review Handler (API Orchestrator)

**Files:**
- Create: `src/server/review-handler.ts`
- Create: `src/server/review-handler.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/server/review-handler.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleReviewRequest } from './review-handler';

const mockPersonality = {
  archetype: 'The Nitpicker',
  emoji: '🔍',
  tagline: 'No detail escapes my review',
  description: 'You examine every line.',
  strengths: ['Thorough'],
  funFacts: ['Reviews on Tuesdays'],
  reviewStyle: 'Meticulous',
  stats: {
    reviewsAnalyzed: 42,
    approvalRate: '34%',
    avgCommentLength: 280,
    mostActiveDay: 'Tuesday',
  },
};

const mockProfile = {
  login: 'octocat',
  name: 'The Octocat',
  avatarUrl: 'https://github.com/octocat.png',
  bio: null,
  publicRepos: 8,
};

const mockGitHubResult = {
  profile: mockProfile,
  stats: {
    totalPRsReviewed: 42,
    approvedCount: 10,
    changesRequestedCount: 25,
    commentOnlyCount: 7,
    reviewCommentCount: 30,
    totalReviewEvents: 42,
    avgCommentLength: 280,
    reviewDays: { Tuesday: 15 },
    commentBodies: ['Fix this'],
  },
};

// Mock the modules
vi.mock('./github', () => ({
  fetchGitHubStats: vi.fn(),
}));

vi.mock('./gemini', () => ({
  generatePersonality: vi.fn(),
}));

import { fetchGitHubStats } from './github';
import { generatePersonality } from './gemini';

describe('handleReviewRequest', () => {
  const mockKV = {
    get: vi.fn(),
    put: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return cached result on cache hit', async () => {
    const cached = JSON.stringify({
      personality: mockPersonality,
      profile: mockProfile,
      cachedAt: '2026-08-16T10:00:00Z',
    });
    mockKV.get.mockResolvedValue(cached);

    const result = await handleReviewRequest('octocat', false, mockKV as never, 'fake-key');

    expect(result.personality.archetype).toBe('The Nitpicker');
    expect(result.cachedAt).toBe('2026-08-16T10:00:00Z');
    expect(fetchGitHubStats).not.toHaveBeenCalled();
  });

  it('should fetch fresh data on cache miss', async () => {
    mockKV.get.mockResolvedValue(null);
    vi.mocked(fetchGitHubStats).mockResolvedValue(mockGitHubResult);
    vi.mocked(generatePersonality).mockResolvedValue(mockPersonality);

    const result = await handleReviewRequest('octocat', false, mockKV as never, 'fake-key');

    expect(result.personality.archetype).toBe('The Nitpicker');
    expect(result.cachedAt).toBeNull();
    expect(fetchGitHubStats).toHaveBeenCalledWith('octocat');
    expect(mockKV.put).toHaveBeenCalled();
  });

  it('should bypass cache when forceRefresh is true', async () => {
    mockKV.get.mockResolvedValue('cached-data');
    vi.mocked(fetchGitHubStats).mockResolvedValue(mockGitHubResult);
    vi.mocked(generatePersonality).mockResolvedValue(mockPersonality);

    await handleReviewRequest('octocat', true, mockKV as never, 'fake-key');

    expect(mockKV.get).not.toHaveBeenCalled();
    expect(fetchGitHubStats).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/review-handler.spec.ts 2>&1 | tail -20`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the review handler**

Create `src/server/review-handler.ts`:

```typescript
import { GoogleGenAI } from '@google/genai';
import { ReviewAnalysisResponse } from '../app/models/reviewer.model';
import { fetchGitHubStats } from './github';
import { generatePersonality } from './gemini';

const CACHE_TTL_SECONDS = 86400; // 24 hours

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export async function handleReviewRequest(
  username: string,
  forceRefresh: boolean,
  kv: KVNamespace,
  geminiApiKey: string,
): Promise<ReviewAnalysisResponse> {
  const cacheKey = `reviewer:${username.toLowerCase()}`;

  // Check cache unless force refresh
  if (!forceRefresh) {
    const cached = await kv.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as ReviewAnalysisResponse;
    }
  }

  // Fetch GitHub data
  const { profile, stats } = await fetchGitHubStats(username);

  // Check if user has any review activity
  if (stats.totalReviewEvents === 0 && stats.totalPRsReviewed === 0) {
    throw new Error('No review activity found');
  }

  // Generate personality via Gemini
  const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
  const personality = await generatePersonality(username, stats, genAI);

  const response: ReviewAnalysisResponse = {
    personality,
    profile,
    cachedAt: null,
  };

  // Cache the result
  const toCache: ReviewAnalysisResponse = {
    ...response,
    cachedAt: new Date().toISOString(),
  };
  await kv.put(cacheKey, JSON.stringify(toCache), { expirationTtl: CACHE_TTL_SECONDS });

  return response;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/server/review-handler.spec.ts 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/server/review-handler.ts src/server/review-handler.spec.ts
git commit -m "feat: add review handler orchestrating GitHub, Gemini, and KV cache"
```

---

## Task 13: Wire Up Server Entry Point

**Files:**
- Modify: `src/server.ts`
- Modify: `wrangler.jsonc`

- [ ] **Step 1: Update the Cloudflare Worker entry point**

Replace `src/server.ts` with:

```typescript
import { AngularAppEngine } from '@angular/ssr';
import { handleReviewRequest } from './server/review-handler';

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  REVIEWER_CACHE: KVNamespace;
  GEMINI_API_KEY: string;
}

const angularApp = new AngularAppEngine();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API route: /api/review/:username
    const reviewMatch = url.pathname.match(/^\/api\/review\/([^/]+)$/);
    if (reviewMatch) {
      const username = decodeURIComponent(reviewMatch[1]);
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
        let status = 500;
        if (message === 'User not found') status = 404;
        else if (message === 'No review activity found') status = 404;
        else if (message.includes('rate limit')) status = 429;

        return new Response(JSON.stringify({ error: message }), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Angular SSR
    const angularResponse = await angularApp.handle(request);
    if (angularResponse) {
      return angularResponse;
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 2: Update wrangler.jsonc with KV binding**

Replace `wrangler.jsonc` with:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "mergeconflicted",
  "main": "./dist/mergeconflicted/server/server.mjs",
  "compatibility_date": "2026-08-16",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "binding": "ASSETS",
    "directory": "./dist/mergeconflicted/browser"
  },
  "kv_namespaces": [
    {
      "binding": "REVIEWER_CACHE",
      "id": "REPLACE_WITH_KV_NAMESPACE_ID"
    }
  ],
  "observability": {
    "enabled": true
  }
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npx ng build 2>&1 | tail -20`
Expected: Build succeeds (KV namespace ID is a placeholder for now — that's fine for build)

- [ ] **Step 4: Commit**

```bash
git add src/server.ts wrangler.jsonc
git commit -m "feat: wire up /api/review/:username endpoint and KV binding"
```

---

## Task 14: Run All Tests & Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all unit tests**

Run: `npx ng test --watch=false 2>&1 | tail -30`
Expected: All Angular tests pass

- [ ] **Step 2: Run all Vitest server tests**

Run: `npx vitest run src/server/ 2>&1 | tail -30`
Expected: All server tests pass

- [ ] **Step 3: Run the build**

Run: `npx ng build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 4: Final commit if any fixes were needed**

If any fixes were made during verification:

```bash
git add -A
git commit -m "fix: address test/build issues from final verification"
```
