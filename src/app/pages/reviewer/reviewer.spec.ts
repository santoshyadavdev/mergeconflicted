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
