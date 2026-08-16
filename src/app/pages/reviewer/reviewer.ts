import { Component, computed, effect, inject } from '@angular/core';
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
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly username = computed(() => this.route.snapshot.paramMap.get('username') ?? '');

  constructor() {
    effect(() => {
      const s = this.state();
      if (s.data) {
        const { personality, profile } = s.data;
        const title = `${profile.login} is "${personality.archetype}" ${personality.emoji} — MergeConflicted`;
        const description = `${personality.tagline} — ${personality.description}`;
        this.titleService.setTitle(title);
        this.meta.updateTag({ property: 'og:title', content: title });
        this.meta.updateTag({ property: 'og:description', content: description });
        this.meta.updateTag({ property: 'og:url', content: `https://mergeconflicted.dev/reviewer/${profile.login}` });
      }
    });
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
