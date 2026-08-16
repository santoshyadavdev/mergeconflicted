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
