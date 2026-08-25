import { Component, computed, DestroyRef, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
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
        <app-share-buttons class="block mt-6" [username]="data.profile.login" [archetype]="data.personality.archetype" />
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
  private static readonly DEFAULT_TITLE = 'MergeConflicted — What Kind of Reviewer Are You?';
  private static readonly DEFAULT_DESCRIPTION = 'Discover your code review personality based on your GitHub activity';
  private static readonly DEFAULT_URL = 'https://mergeconflicted.santosh-yadav198613.workers.dev';
  private static readonly DEFAULT_OG_IMAGE = 'https://mergeconflicted.santosh-yadav198613.workers.dev/api/og';
  private static readonly DEFAULT_OG_IMAGE_ALT = 'MergeConflicted — Discover your code review personality';

  private readonly route = inject(ActivatedRoute);
  private readonly reviewService = inject(ReviewService);
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly username = computed(() => this.route.snapshot.paramMap.get('username') ?? '');

  constructor() {
    effect(() => {
      const s = this.state();
      if (s.data) {
        const { personality, profile } = s.data;
        const title = `${profile.login} is "${personality.archetype}" ${personality.emoji} — MergeConflicted`;
        const description = `${personality.tagline} — ${personality.description}`;
        const url = `https://mergeconflicted.santosh-yadav198613.workers.dev/reviewer/${profile.login}`;
        const ogImage = `https://mergeconflicted.santosh-yadav198613.workers.dev/api/og/${profile.login}`;

        this.titleService.setTitle(title);

        // Open Graph
        this.meta.updateTag({ property: 'og:title', content: title });
        this.meta.updateTag({ property: 'og:description', content: description });
        this.meta.updateTag({ property: 'og:url', content: url });
        this.meta.updateTag({ property: 'og:image', content: ogImage });
        this.meta.updateTag({ property: 'og:image:alt', content: `${profile.login}'s code review personality: ${personality.archetype}` });

        // Twitter Card
        this.meta.updateTag({ name: 'twitter:title', content: title });
        this.meta.updateTag({ name: 'twitter:description', content: description });
        this.meta.updateTag({ name: 'twitter:image', content: ogImage });
        this.meta.updateTag({ name: 'twitter:image:alt', content: `${profile.login}'s code review personality: ${personality.archetype}` });
      } else if (!s.loading) {
        this.restoreDefaultMeta();
      }
    });

    this.destroyRef.onDestroy(() => this.restoreDefaultMeta());
  }

  private restoreDefaultMeta(): void {
    this.titleService.setTitle(ReviewerPage.DEFAULT_TITLE);

    this.meta.updateTag({ property: 'og:title', content: ReviewerPage.DEFAULT_TITLE });
    this.meta.updateTag({ property: 'og:description', content: ReviewerPage.DEFAULT_DESCRIPTION });
    this.meta.updateTag({ property: 'og:url', content: ReviewerPage.DEFAULT_URL });
    this.meta.updateTag({ property: 'og:image', content: ReviewerPage.DEFAULT_OG_IMAGE });
    this.meta.updateTag({ property: 'og:image:alt', content: ReviewerPage.DEFAULT_OG_IMAGE_ALT });

    this.meta.updateTag({ name: 'twitter:title', content: ReviewerPage.DEFAULT_TITLE });
    this.meta.updateTag({ name: 'twitter:description', content: ReviewerPage.DEFAULT_DESCRIPTION });
    this.meta.updateTag({ name: 'twitter:image', content: ReviewerPage.DEFAULT_OG_IMAGE });
    this.meta.updateTag({ name: 'twitter:image:alt', content: ReviewerPage.DEFAULT_OG_IMAGE_ALT });
  }

  private readonly result$ = this.route.paramMap.pipe(
    map((params) => params.get('username') ?? ''),
    switchMap((username) =>
      this.reviewService.getReviewerPersonality(username).pipe(
        map((data): ReviewerState => ({ loading: false, data, error: null })),
        catchError((err) => {
          const status = err.status as number;
          const code = err.error?.code as string | undefined;
          let message = 'Something went wrong — please try again later';
          if (status === 404 || code === 'USER_NOT_FOUND') {
            message = `User "${username}" not found — check the spelling and try again`;
          } else if (status === 422 || code === 'NO_REVIEW_ACTIVITY') {
            message = `User "${username}" has no public review activity yet`;
          } else if (status === 429) {
            message = 'Too many requests — please try again in a few minutes';
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
