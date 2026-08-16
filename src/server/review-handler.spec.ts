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
