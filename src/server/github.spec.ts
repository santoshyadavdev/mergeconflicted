import { describe, it, expect, vi } from 'vitest';
import { fetchGitHubStats } from './github';

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

  it('should throw on rate limit (403) for events', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(mockUserResponse)))
      .mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));

    await expect(fetchGitHubStats('octocat', mockFetch as unknown as typeof fetch)).rejects.toThrow('GitHub rate limit exceeded (403)');
  });

  it('should throw on rate limit (429) for search', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(mockUserResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockEventsResponse)))
      .mockResolvedValueOnce(new Response('Too Many Requests', { status: 429 }));

    await expect(fetchGitHubStats('octocat', mockFetch as unknown as typeof fetch)).rejects.toThrow('GitHub rate limit exceeded (429)');
  });

  it('should include Authorization header when token provided', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(mockUserResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockEventsResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockSearchResponse)));

    await fetchGitHubStats('octocat', mockFetch as unknown as typeof fetch, 'ghp_test123');

    const firstCallHeaders = mockFetch.mock.calls[0][1].headers;
    expect(firstCallHeaders['Authorization']).toBe('Bearer ghp_test123');
  });
});
